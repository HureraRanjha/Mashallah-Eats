from django.shortcuts import render, redirect
import os
import ollama
from ollama import Client
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import MenuItem, DiscussionTopic, DiscussionPost, OrderItem, DeliveryBid, DeliveryAssignment, Order, FoodRating, DeliveryRating, UserProfile, CustomerProfile, Transaction, Chef, Complaint, DeliveryPerson, Compliment
import stripe
from decimal import Decimal
from django.conf import settings
from django.db import transaction
from rest_framework import status

from .models import KnowledgeBaseEntry

stripe.api_key = settings.STRIPE_SECRET_KEY
from .serializers import(
    MenuItemSerializer,
    DiscussionTopicSerializer,
    DiscussionPostSerializer,
    OrderSerializer,
    ItemSerializer,
    FoodReviewSerializer,
    AddMenuSerializer,
    DeliveryBidSerializer,
    DeliveryAssignmentSerializer,
    OrderWithBidsSerializer,
    DeliveryReviewSerializer,
    ComplaintSerializer,
    ComplimentSerializer,
    UserProfileSerializer,
    HireEmployeeSerializer,
    FireEmployeeSerializer,
    UpdateSalarySerializer,
    AwardBonusSerializer,
    ChefListSerializer,
    DeliveryPersonListSerializer,
    CustomerListSerializer,
    RegistrationRequestSerializer,
    ProcessRegistrationSerializer,
    CloseAccountSerializer,
    MenuSearchResultSerializer,
    TopChefSerializer,
)
from .models import RegistrationRequest

from rest_framework.decorators import api_view
from rest_framework.response import Response

def index(request):
    return HttpResponse("Hello from the backend API")

@api_view(["GET"])
def DishListView(request):
    user = request.user

    # Default values for anonymous users
    warnings_count = 0
    current_balance = 0
    profile = None

    # 1. Check User Details (if logged in)
    if user.is_authenticated and hasattr(user, "userprofile"):
        profile = user.userprofile

        # Only check balance for Customers (not Chefs/Managers)
        if profile.user_type in ["registered", "vip"]:
            customer = getattr(profile, "customerprofile", None)
            if customer:
                warnings_count = customer.warnings_count
                current_balance = customer.deposit_balance

    # 2. Filter Menu Items (VIP vs Regular)
    items = MenuItem.objects.all()
    non_vip_items = MenuItem.objects.filter(is_vip_exclusive=False)

    if profile and profile.user_type == "vip":
        serializer = MenuItemSerializer(items, many=True)
    else:
        serializer = MenuItemSerializer(non_vip_items, many=True)

    # 3. Return the JSON
    return Response({
        "items": serializer.data,
        "user_info": {
            "warnings_count": warnings_count,
            "current_balance": str(current_balance),
        }
    })

@api_view(["GET"])
def Discussions(request):
    topics = DiscussionTopic.objects.all().order_by('-created_at')

    # Build response with post counts and author names
    titles_data = []
    for topic in topics:
        post_count = DiscussionPost.objects.filter(topic=topic).count()
        titles_data.append({
            "id": topic.id,
            "title": topic.title,
            "author_name": topic.author.username,
            "topic_type": topic.topic_type,
            "post_count": post_count,
            "created_at": topic.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    return Response({
        "titles": titles_data,
    })

@api_view(["POST"])
@csrf_exempt
def create_reply(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "You must be logged in to post comments"}, status=401)

    topic_id = request.data.get("topic_id")
    body = request.data.get("body")

    if not topic_id:
        return Response({"error": "topic_id is required"}, status=400)
    if not body:
        return Response({"error": "Comment body is required"}, status=400)

    try:
        topic = DiscussionTopic.objects.get(id=topic_id)
    except DiscussionTopic.DoesNotExist:
        return Response({"error": "Topic not found"}, status=404)

    post = DiscussionPost.objects.create(
        topic=topic,
        author=user,
        content=body
    )

    return Response({
        "id": post.id,
        "author": post.author.username,
        "body": post.content,
        "created_at": post.created_at.strftime("%Y-%m-%d %H:%M"),
    }, status=201)


@api_view(["GET", "POST"])
@csrf_exempt
def create_topic(request):
    # GET: Fetch topic details with posts
    if request.method == "GET":
        post_id = request.GET.get("post_id")
        if not post_id:
            return Response({"error": "post_id is required"}, status=400)

        try:
            topic = DiscussionTopic.objects.get(id=post_id)
        except DiscussionTopic.DoesNotExist:
            return Response({"error": "Topic not found"}, status=404)

        # Get all posts (comments) for this topic
        posts = DiscussionPost.objects.filter(topic=topic).order_by('created_at')

        return Response({
            "post": {
                "id": topic.id,
                "title": topic.title,
                "author": topic.author.username,
                "topic_type": topic.topic_type,
                "created_at": topic.created_at.strftime("%Y-%m-%d %H:%M"),
                "body": "",  # Topics don't have body, posts do
            },
            "comments": [
                {
                    "id": post.id,
                    "author": post.author.username,
                    "body": post.content,
                    "created_at": post.created_at.strftime("%Y-%m-%d %H:%M"),
                }
                for post in posts
            ]
        })

    # POST: Create a new topic
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "You must be logged in to create topics"}, status=401)

    title = request.data.get("title")
    topic_type = request.data.get("topic_type", "general")

    if not title:
        return Response({"error": "Title is required"}, status=400)

    # Optional related entities
    related_chef = None
    related_dish = None
    related_delivery = None

    if topic_type == "chef":
        chef_id = request.data.get("related_chef")
        if chef_id:
            try:
                related_chef = Chef.objects.get(id=chef_id)
            except Chef.DoesNotExist:
                pass
    elif topic_type == "dish":
        dish_id = request.data.get("related_dish")
        if dish_id:
            try:
                related_dish = MenuItem.objects.get(id=dish_id)
            except MenuItem.DoesNotExist:
                pass
    elif topic_type == "delivery":
        delivery_id = request.data.get("related_delivery")
        if delivery_id:
            try:
                related_delivery = DeliveryPerson.objects.get(id=delivery_id)
            except DeliveryPerson.DoesNotExist:
                pass

    topic = DiscussionTopic.objects.create(
        title=title,
        author=user,
        topic_type=topic_type,
        related_chef=related_chef,
        related_dish=related_dish,
        related_delivery=related_delivery
    )

    return Response({
        "id": topic.id,
        "title": topic.title,
        "author": topic.author.username,
        "topic_type": topic.topic_type,
        "created_at": topic.created_at.strftime("%Y-%m-%d %H:%M"),
    }, status=201)

@api_view(["POST"])
@csrf_exempt
def order_food(request):
    """
    MERGED VERSION:
    - User Logic: Atomic transaction, Balance Check, Payment Deduction, Optimized Queries
    - Group Logic: Delivery Fees, Driver Fees, VIP 3rd Order Free logic
    """
    data = request.data
    # Allow getting customer_id from request (for testing) or logged-in user
    if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
        customer_id = request.user.userprofile.customerprofile.id
    else:
        customer_id = data.get("customer_id")

    items_data = data.get("items", [])
    delivery_address = data.get("delivery_address", "")
    if not items_data:
        return Response({"error": "No items provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # 1. LOCK THE CUSTOMER ROW (Your Security Logic)
            try:
                customer_profile = CustomerProfile.objects.select_for_update().get(id=customer_id)
            except CustomerProfile.DoesNotExist:
                return Response({"error": "Customer not found"}, status=status.HTTP_404_NOT_FOUND)

            # 2. CALCULATE ITEM TOTALS (Your Optimized Logic)
            item_ids = [item['menu_item_id'] for item in items_data]
            menu_items_map = {m.id: m for m in MenuItem.objects.filter(id__in=item_ids)}
            
            subtotal = Decimal("0.00")
            temp_items = []

            for item in items_data:
                m_id = item["menu_item_id"]
                menu_item = menu_items_map.get(m_id)
                if not menu_item:
                    raise ValueError(f"Menu Item ID {m_id} does not exist")
                
                qty = item["quantity"]
                # Ensure we use Decimals for money
                price = Decimal(str(menu_item.price))
                subtotal += price * qty
                
                temp_items.append((menu_item, qty, price))

            # 3. CALCULATE FEES (Group's Logic)
            DELIVERY_FEE = Decimal("2.50")
            DRIVER_FEE = Decimal("1.00")
            
            # Check VIP rules
            is_vip = customer_profile.user_profile.user_type == 'vip'
            
            if is_vip:
                # Group Logic: Every 3rd order is free delivery
                # We count existing orders + 1 for current
                current_order_num = customer_profile.order_count + 1
                if current_order_num % 3 == 0:
                    DELIVERY_FEE = Decimal("0.00")
                
                # Group Logic: 5% Discount on food
                subtotal = subtotal * Decimal("0.95")

            grand_total = subtotal + DELIVERY_FEE + DRIVER_FEE
            grand_total = grand_total.quantize(Decimal("0.01"))

            # 4. CHECK BALANCE & DEDUCT (Your Security Logic)
            if customer_profile.deposit_balance < grand_total:
                # Per requirements: customer gets warning for being reckless
                warnings_count = customer_profile.add_warning()
                return Response({
                    "error": "Insufficient funds",
                    "current_balance": str(customer_profile.deposit_balance),
                    "order_total": str(grand_total),
                    "warning_issued": True,
                    "warnings_count": warnings_count,
                    "is_blacklisted": customer_profile.is_blacklisted
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

            # Deduct money
            customer_profile.deposit_balance -= grand_total
            customer_profile.total_spent += grand_total  # Lifetime spending (never resets)
            customer_profile.vip_progress_spent += grand_total  # VIP progress (resets on demotion)
            customer_profile.order_count += 1

            # Check for VIP upgrade (Your Logic)
            upgraded = customer_profile.check_vip_upgrade()
            customer_profile.save()

            # 5. SAVE ORDER (Combined Logic)
            order_serializer = OrderSerializer(data={
                "customer": customer_id,
                "total_price": grand_total,
                "status": "pending",
                "delivery_address": delivery_address,
                # Save fee info if your model supports it, otherwise ignore
            })
            if not order_serializer.is_valid():
                raise ValueError(str(order_serializer.errors))
            
            order = order_serializer.save()

            created_items_data = []
            for menu_item, qty, price in temp_items:
                OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=qty,
                    price_at_time=price
                )
                created_items_data.append({
                    "menu_item": menu_item.name,
                    "quantity": qty,
                    "price": str(price)
                })

            response_data = {
                "order_id": order.id,
                "subtotal": str(subtotal),
                "delivery_fee": str(DELIVERY_FEE),
                "driver_fee": str(DRIVER_FEE),
                "total_price": str(grand_total),
                "remaining_balance": str(customer_profile.deposit_balance),
                "items": created_items_data,
                "status": "pending"
            }

            if upgraded:
                response_data["upgraded_to_vip"] = True
                response_data["message"] = "Order placed successfully! Congratulations! You have been upgraded to VIP status!"

            return Response(response_data, status=status.HTTP_201_CREATED)

    except ValueError as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({"error": f"Order processing failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def check_vip_upgrade(profile):
    customer = profile.customerprofile
    if customer.order_count >= 3 or customer.total_spent >= 100:
        profile.user_type = "vip"
        profile.save()

@api_view(["POST"])
@csrf_exempt
def food_review(request):
    serializer = FoodReviewSerializer(data=request.data)

    if serializer.is_valid():
        review = serializer.save(customer=request.user.userprofile.customerprofile)

        order_item = review.order_item
        menu_item = order_item.menu_item
        chef = menu_item.chef

        dish_ratings = FoodRating.objects.filter(
            order_item__menu_item=menu_item
        )

        dish_count = dish_ratings.count()
        if dish_count > 0:
            dish_total = sum(r.rating for r in dish_ratings)
            dish_avg = dish_total / dish_count
        else:
            dish_avg = 0

        menu_item.average_rating = dish_avg
        menu_item.total_orders += 1
        menu_item.save()

        chef_ratings = FoodRating.objects.filter(
            order_item__menu_item__chef=chef
        )
        chef_count = chef_ratings.count()
        if chef_count > 0:
            chef_total = sum(r.rating for r in chef_ratings)
            chef_avg = chef_total / chef_count
        else:
            chef_avg = 0

        chef.update_rating(chef_avg)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["POST"])
def delivery_rating(request):
    serializer = DeliveryReviewSerializer(data=request.data)
    if serializer.is_valid():
        review = serializer.save()
        delivery_person = review.order.delivery_person
        ratings = DeliveryRating.objects.filter(order__delivery_person=delivery_person)

        # compute average
        total = sum(r.rating for r in ratings)
        count = ratings.count()
        avg = total / count

        delivery_person.update_rating(avg)

        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["POST"])
@csrf_exempt
def add_menu(request):
    user = request.user
    profile = user.userprofile

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if profile.user_type != "chef":
        return Response({"error": "Only chefs can add menu items"}, status=403)
    
    chef_profile = profile.chef
    data = request.data.copy()
    data["chef"] = chef_profile.id

    serializer = AddMenuSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)



@api_view(["POST"])
def LoginUser(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"error": "Missing required fields"}, status=400)

    user = authenticate(request, username=username, password=password)

    if user is None:
        return Response({"error": "Invalid username or password"}, status=401)

    try:
        profile = user.userprofile
    except UserProfile.DoesNotExist:
        return Response({"error": "Account setup incomplete. Please register."}, status=400)

    # Check if customer is blacklisted
    if profile.user_type in ['registered', 'vip']:
        customer_profile = getattr(profile, 'customerprofile', None)
        if customer_profile and customer_profile.is_blacklisted:
            return Response({
                "error": "Your account has been suspended due to policy violations. Please contact support.",
                "blacklisted": True
            }, status=403)

    login(request, user)

    # Get customer_profile_id if user is a customer
    customer_profile_id = None
    if profile.user_type in ['registered', 'vip']:
        customer_profile = getattr(profile, 'customerprofile', None)
        if customer_profile:
            customer_profile_id = customer_profile.id

    return Response({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "user_type": profile.user_type,
            "customer_profile_id": customer_profile_id
        }
    }, status=200)


@api_view(["POST"])
def create_delivery_bid(request):
    user  = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "delivery":
        return Response({"error": "Only delivery personnel can bid"}, status=403)
    
    delivery_profile = profile.deliveryperson
    data = request.data.copy()
    data["delivery_person"] = delivery_profile.id

    serializer = DeliveryBidSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)

@api_view(["GET"])
def get_delivery_bids(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only manager personnel can view bids"}, status=403)

    pending_orders = Order.objects.filter(status="pending").exclude(assignment__isnull=False)
    serializer = OrderWithBidsSerializer(pending_orders, many=True)

    return Response({"orders": serializer.data})


@api_view(["GET"])
def get_delivery_persons(request):
    """Get all delivery persons for manager to manually assign."""
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can access this"}, status=403)

    delivery_persons = DeliveryPerson.objects.select_related('user_profile__user').all()
    data = [
        {
            "id": dp.id,
            "username": dp.user_profile.user.username,
            "email": dp.user_profile.user.email,
            "average_rating": dp.average_rating,
            "total_deliveries": Order.objects.filter(delivery_person=dp, status="delivered").count(),
        }
        for dp in delivery_persons
    ]

    return Response({"delivery_persons": data})


@api_view(["POST"])
@csrf_exempt
def assign_delivery(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can assign deliveries"}, status=403)

    order_id = request.data.get("order_id")
    bid_id = request.data.get("bid_id")
    delivery_person_id = request.data.get("delivery_person_id")  # For manual assignment
    delivery_fee = request.data.get("delivery_fee")  # For manual assignment
    justification = request.data.get("justification_memo", "")

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)

    # Manual assignment (no bid)
    if delivery_person_id and delivery_fee:
        try:
            delivery_person = DeliveryPerson.objects.get(id=delivery_person_id)
        except DeliveryPerson.DoesNotExist:
            return Response({"error": "Delivery person not found"}, status=404)

        # Create assignment record
        DeliveryAssignment.objects.create(
            order_id=order_id,
            delivery_person=delivery_person,
            assigned_by=user,
            winning_bid=None,
            justification_memo=justification or "Manual assignment by manager"
        )

        # Update order
        order.delivery_person = delivery_person
        order.delivery_bid_price = Decimal(str(delivery_fee))
        order.status = "preparing"
        order.save()

        return Response({"message": "Delivery manually assigned", "order_id": order_id}, status=201)

    # Bid-based assignment
    if not bid_id:
        return Response({"error": "Either bid_id or delivery_person_id with delivery_fee required"}, status=400)

    try:
        selected_bid = DeliveryBid.objects.get(id=bid_id)
    except DeliveryBid.DoesNotExist:
        return Response({"error": "Bid not found"}, status=404)

    lowest_bid = DeliveryBid.objects.filter(order_id=order_id).first()

    # Require justification if not choosing lowest bidder
    if lowest_bid and selected_bid.id != lowest_bid.id and not justification:
        return Response({"error": "Justification memo required when not selecting lowest bidder"}, status=400)

    # Create assignment record
    DeliveryAssignment.objects.create(
        order_id=order_id,
        delivery_person=selected_bid.delivery_person,
        assigned_by=user,
        winning_bid=selected_bid,
        justification_memo=justification if (lowest_bid and selected_bid.id != lowest_bid.id) else None
    )

    # Update order
    order.delivery_person = selected_bid.delivery_person
    order.delivery_bid_price = selected_bid.bid_amount
    order.status = "preparing"
    order.save()

    return Response({"message": "Delivery assigned", "order_id": order_id}, status=201)


# ============================================
# DELIVERY DASHBOARD ENDPOINTS
# ============================================

@api_view(["GET"])
def get_available_orders(request):
    """Get orders available for delivery bidding."""
    from .serializers import AvailableOrderSerializer

    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "delivery":
        return Response({"error": "Only delivery personnel can access this"}, status=403)

    delivery_person = profile.deliveryperson

    # Get pending orders without assignment
    available_orders = Order.objects.filter(
        status="pending"
    ).exclude(
        assignment__isnull=False
    ).order_by('-created_at')

    serializer = AvailableOrderSerializer(
        available_orders,
        many=True,
        context={'delivery_person': delivery_person}
    )

    return Response({"orders": serializer.data})


@api_view(["GET"])
def get_my_bids(request):
    """Get delivery person's pending bids."""
    from .serializers import MyBidSerializer

    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "delivery":
        return Response({"error": "Only delivery personnel can access this"}, status=403)

    delivery_person = profile.deliveryperson

    # Get bids where order is still pending (not yet assigned)
    my_bids = DeliveryBid.objects.filter(
        delivery_person=delivery_person,
        order__status="pending"
    ).exclude(
        order__assignment__isnull=False
    ).order_by('-created_at')

    serializer = MyBidSerializer(my_bids, many=True)

    return Response({"bids": serializer.data})


@api_view(["GET"])
def get_my_deliveries(request):
    """Get delivery person's assigned deliveries."""
    from .serializers import MyDeliverySerializer

    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "delivery":
        return Response({"error": "Only delivery personnel can access this"}, status=403)

    delivery_person = profile.deliveryperson

    # Get active deliveries (preparing or delivering)
    active = Order.objects.filter(
        delivery_person=delivery_person,
        status__in=["preparing", "delivering"]
    ).order_by('-created_at')

    # Get completed deliveries
    completed = Order.objects.filter(
        delivery_person=delivery_person,
        status="delivered"
    ).order_by('-created_at')

    return Response({
        "active": MyDeliverySerializer(active, many=True).data,
        "completed": MyDeliverySerializer(completed, many=True).data
    })


@api_view(["POST"])
@csrf_exempt
def update_delivery_status(request):
    """Update order status during delivery."""
    from .serializers import UpdateDeliveryStatusSerializer

    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "delivery":
        return Response({"error": "Only delivery personnel can access this"}, status=403)

    serializer = UpdateDeliveryStatusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    delivery_person = profile.deliveryperson

    try:
        order = Order.objects.get(id=data["order_id"])
    except Order.DoesNotExist:
        return Response({"error": "Order not found"}, status=404)

    # Verify this delivery person is assigned to the order
    if order.delivery_person != delivery_person:
        return Response({"error": "You are not assigned to this order"}, status=403)

    new_status = data["new_status"]

    # Validate status transitions
    if new_status == "delivering" and order.status != "preparing":
        return Response({"error": "Can only start delivery for orders being prepared"}, status=400)

    if new_status == "delivered" and order.status != "delivering":
        return Response({"error": "Can only mark as delivered for orders being delivered"}, status=400)

    order.status = new_status
    order.save()

    return Response({
        "message": f"Order status updated to {new_status}",
        "order_id": order.id,
        "status": order.status
    })


@api_view(["GET"])
def get_delivery_stats(request):
    """Get delivery person's profile stats."""
    from .serializers import DeliveryStatsSerializer

    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "delivery":
        return Response({"error": "Only delivery personnel can access this"}, status=403)

    delivery_person = profile.deliveryperson
    serializer = DeliveryStatsSerializer(delivery_person)

    return Response({"stats": serializer.data})


@api_view(["POST"])
def RegisterUser(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")
    confirm  = request.data.get("confirm_password")

    if not username or not password or not confirm:
        return Response({"error": "Missing required fields"}, status=400)
    
    if password != confirm:
        return Response({"error": "Passwords do not match"}, status=400)
    
    if CustomerProfile.objects.filter(
        user_profile__user__username=username,
        is_blacklisted=True
    ).exists():
        return Response(
            {"error": "This username belongs to a blacklisted user and cannot be used."},
            status=403
        )

    if CustomerProfile.objects.filter(
        user_profile__user__email=email,
        is_blacklisted=True
    ).exists():
        return Response(
            {"error": "This email belongs to a blacklisted user and cannot be used."},
            status=403
        )

    user = User(username=username, email=email)
    user.set_password(password)
    user.save()

    
    UserProfile.objects.create(
        user=user,
        user_type="registered"
    )

    return Response({
    "message": "User registered successfully",
    "user": {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }
    }, status=201)


@api_view(["POST"])
def create_deposit_intent(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type not in ["registered", "vip"]:
        return Response({"error": "Only customers can deposit"}, status=403)

    amount = request.data.get("amount")
    if not amount or float(amount) <= 0:
        return Response({"error": "Invalid amount"}, status=400)

    # Stripe expects amount in cents
    amount_cents = int(float(amount) * 100)

    customer = profile.customerprofile

    # Create or get Stripe customer
    if not customer.stripe_customer_id:
        stripe_customer = stripe.Customer.create(
            email=user.email,
            name=user.username
        )
        customer.stripe_customer_id = stripe_customer.id
        customer.save()

    # Create PaymentIntent
    intent = stripe.PaymentIntent.create(
        amount=amount_cents,
        currency="usd",
        customer=customer.stripe_customer_id,
        metadata={"user_id": user.id, "type": "deposit"}
    )

    return Response({
        "client_secret": intent.client_secret,
        "amount": amount
    })


@api_view(["POST"])
def confirm_deposit(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    payment_intent_id = request.data.get("payment_intent_id")

    # Verify payment with Stripe
    intent = stripe.PaymentIntent.retrieve(payment_intent_id)

    if intent.status != "succeeded":
        return Response({"error": "Payment not successful"}, status=400)

    # Check if already processed
    if Transaction.objects.filter(stripe_payment_intent_id=payment_intent_id).exists():
        return Response({"error": "Payment already processed"}, status=400)

    customer = user.userprofile.customerprofile
    amount = Decimal(intent.amount) / Decimal(100)  # Convert cents to dollars

    # Credit the balance
    customer.deposit_balance += amount
    customer.save()

    # Record transaction
    Transaction.objects.create(
        user=user,
        transaction_type="deposit",
        amount=amount,
        stripe_payment_intent_id=payment_intent_id,
        payment_status="succeeded",
        balance_after=customer.deposit_balance
    )

    return Response({
        "message": "Deposit successful",
        "amount": str(amount),
        "new_balance": str(customer.deposit_balance)
    })

@api_view(["GET"])
def order_history(request):
    # 1. Get the logged-in user
    user = request.user
    
    # 2. Check Authentication
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
    
    # 3. Get the Customer Profile
    try:
        customer_profile = user.userprofile.customerprofile
    except AttributeError:
        return Response({"error": "User is not a customer"}, status=status.HTTP_403_FORBIDDEN)

    # 4. Fetch Orders (Newest first)
    orders = Order.objects.filter(customer=customer_profile).order_by('-created_at')
    
    # 5. Serialize
    # We use a custom format here to include specific details users care about
    data = []
    for order in orders:
        items = order.items.all()
        item_names = [f"{i.quantity}x {i.menu_item.name}" for i in items]

        # Include individual items with IDs for rating
        items_detail = []
        for item in items:
            # Check if already rated
            already_rated = FoodRating.objects.filter(
                order_item=item,
                customer=customer_profile
            ).exists()

            items_detail.append({
                "order_item_id": item.id,
                "menu_item_id": item.menu_item.id,
                "name": item.menu_item.name,
                "quantity": item.quantity,
                "price": str(item.price_at_time),
                "already_rated": already_rated
            })

        # Check if delivery already rated
        delivery_rated = DeliveryRating.objects.filter(
            order=order,
            customer=customer_profile
        ).exists()

        data.append({
            "order_id": order.id,
            "status": order.get_status_display(),
            "total_price": str(order.total_price),
            "date": order.created_at.strftime("%Y-%m-%d %H:%M"),
            "items_summary": ", ".join(item_names),
            "items": items_detail,
            "is_delivered": order.status == 'delivered',
            "delivery_rated": delivery_rated
        })

    return Response({"orders": data})

@api_view(["POST"])
@csrf_exempt
def file_complaint(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile

    if profile.user_type not in ["registered", "vip", "delivery"]:
        return Response({"error": "Only customers and delivery persons can file complaints"}, status=403)

    target_type = request.data.get("target_type")
    description = request.data.get("description")

    if not target_type or not description:
        return Response({"error": "target_type and description are required"}, status=400)

    # Customers can complain about chefs, delivery persons, or other customers (discussion forum behavior)
    if profile.user_type in ["registered", "vip"]:
        if target_type not in ["chef", "delivery", "customer"]:
            return Response({"error": "Customers can only complain about chefs, delivery persons, or other customers"}, status=400)

    # Delivery persons can complain about customers
    if profile.user_type == "delivery":
        if target_type != "customer":
            return Response({"error": "Delivery persons can only complain about customers"}, status=400)

    weight = 2 if profile.user_type == "vip" else 1

    # Look up the target user based on target_type
    target_user = None
    target_chef = None
    target_delivery = None

    if target_type == "chef":
        chef_id = request.data.get("chef_id")
        if not chef_id:
            return Response({"error": "chef_id is required for chef complaints"}, status=400)
        try:
            target_chef = Chef.objects.get(id=chef_id)
            target_user = target_chef.user_profile.user
        except Chef.DoesNotExist:
            return Response({"error": "Chef not found"}, status=404)

    elif target_type == "delivery":
        delivery_id = request.data.get("delivery_id")
        if not delivery_id:
            return Response({"error": "delivery_id is required for delivery complaints"}, status=400)
        try:
            target_delivery = DeliveryPerson.objects.get(id=delivery_id)
            target_user = target_delivery.user_profile.user
        except DeliveryPerson.DoesNotExist:
            return Response({"error": "Delivery person not found"}, status=404)

    elif target_type == "customer":
        customer_username = request.data.get("customer_username")
        if not customer_username:
            return Response({"error": "customer_username is required for customer complaints"}, status=400)
        try:
            target_user = User.objects.get(username=customer_username)
            # Verify they are actually a customer
            if target_user.userprofile.user_type not in ["registered", "vip"]:
                return Response({"error": "Target user is not a customer"}, status=400)
        except User.DoesNotExist:
            return Response({"error": "Customer not found"}, status=404)

    # Get optional order_id
    order_id = request.data.get("order_id")
    order = None
    if order_id:
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            pass  # Order reference is optional

    # Create the complaint
    complaint = Complaint.objects.create(
        complainant=user,
        target_user=target_user,
        target_type=target_type,
        target_chef=target_chef,
        target_delivery=target_delivery,
        order=order,
        description=description,
        weight=weight,
        status="pending"
    )

    return Response({
        "message": "Complaint filed successfully",
        "complaint": {
            "id": complaint.id,
            "target_type": complaint.target_type,
            "target_user": complaint.target_user.username,
            "description": complaint.description,
            "status": complaint.status
        }
    }, status=201)

@api_view(["GET"])
def get_complaints(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can view complaints"}, status=403)

    # Return all complaints (pending, disputed, upheld, dismissed) for manager to filter
    all_complaints = Complaint.objects.all().order_by('-created_at')
    serializer = ComplaintSerializer(all_complaints, many=True)
    return Response({"complaints": serializer.data})


@api_view(["POST"])
@csrf_exempt
def file_compliment(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile

    # Only customers and delivery persons can file compliments
    if profile.user_type not in ["registered", "vip", "delivery"]:
        return Response({"error": "Only customers and delivery persons can file compliments"}, status=403)

    target_type = request.data.get("target_type")
    description = request.data.get("description")

    if not target_type or not description:
        return Response({"error": "target_type and description are required"}, status=400)

    # Customers can compliment chefs and delivery persons
    if profile.user_type in ["registered", "vip"]:
        if target_type not in ["chef", "delivery"]:
            return Response({"error": "Customers can only compliment chefs or delivery persons"}, status=400)

    # Delivery persons can compliment customers
    if profile.user_type == "delivery":
        if target_type != "customer":
            return Response({"error": "Delivery persons can only compliment customers"}, status=400)

    # VIP compliments count double
    weight = 2 if profile.user_type == "vip" else 1

    # Look up the target user based on target_type
    target_user = None
    target_chef = None
    target_delivery = None

    if target_type == "chef":
        chef_id = request.data.get("chef_id")
        if not chef_id:
            return Response({"error": "chef_id is required for chef compliments"}, status=400)
        try:
            target_chef = Chef.objects.get(id=chef_id)
            target_user = target_chef.user_profile.user
        except Chef.DoesNotExist:
            return Response({"error": "Chef not found"}, status=404)

    elif target_type == "delivery":
        delivery_id = request.data.get("delivery_id")
        if not delivery_id:
            return Response({"error": "delivery_id is required for delivery compliments"}, status=400)
        try:
            target_delivery = DeliveryPerson.objects.get(id=delivery_id)
            target_user = target_delivery.user_profile.user
        except DeliveryPerson.DoesNotExist:
            return Response({"error": "Delivery person not found"}, status=404)

    elif target_type == "customer":
        customer_username = request.data.get("customer_username")
        if not customer_username:
            return Response({"error": "customer_username is required for customer compliments"}, status=400)
        try:
            target_user = User.objects.get(username=customer_username)
            # Verify they are actually a customer
            if target_user.userprofile.user_type not in ["registered", "vip"]:
                return Response({"error": "Target user is not a customer"}, status=400)
        except User.DoesNotExist:
            return Response({"error": "Customer not found"}, status=404)

    # Get optional order_id
    order_id = request.data.get("order_id")
    order = None
    if order_id:
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            pass  # Order reference is optional

    # Create the compliment
    compliment = Compliment.objects.create(
        author=user,
        target_user=target_user,
        target_type=target_type,
        target_chef=target_chef,
        target_delivery=target_delivery,
        order=order,
        description=description,
        weight=weight,
        status="pending"
    )

    return Response({
        "message": "Compliment filed successfully",
        "compliment": {
            "id": compliment.id,
            "target_type": compliment.target_type,
            "target_user": compliment.target_user.username,
            "description": compliment.description,
            "status": compliment.status
        }
    }, status=201)

@api_view(["GET"])
def get_compliments(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    
    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can view compliments"}, status=403)
    
    pending_compliments = Compliment.objects.filter(status="pending")
    serializer = ComplimentSerializer(pending_compliments, many=True)
    return Response({"compliments": serializer.data})


@api_view(["POST"])
@csrf_exempt
def process_complaint(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can process complaints"}, status=403)

    complaint_id = request.data.get("complaint_id")
    decision = request.data.get("decision")
    manager_notes = request.data.get("manager_decision", "")

    if not complaint_id or not decision:
        return Response({"error": "complaint_id and decision are required"}, status=400)

    if decision not in ["upheld", "dismissed"]:
        return Response({"error": "decision must be 'upheld' or 'dismissed'"}, status=400)

    try:
        complaint = Complaint.objects.get(id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({"error": "Complaint not found"}, status=404)

    if complaint.status != "pending":
        return Response({"error": "Complaint has already been processed"}, status=400)

    from django.utils import timezone

    complaint.status = decision
    complaint.manager_decision = manager_notes
    complaint.processed_by = user
    complaint.processed_at = timezone.now()
    complaint.save()

    result = {"message": f"Complaint {decision}", "complaint_id": complaint_id}

    if decision == "upheld":
        target_type = complaint.target_type
        target_user = complaint.target_user

        if target_type == "customer":
            try:
                customer_profile = target_user.userprofile.customerprofile
                warnings_count = customer_profile.add_warning()
                result["warnings_count"] = warnings_count
                result["is_blacklisted"] = customer_profile.is_blacklisted
                result["user_type"] = customer_profile.user_profile.user_type
            except (UserProfile.DoesNotExist, CustomerProfile.DoesNotExist):
                result["warning"] = "Could not find customer profile to add warning"

        elif target_type == "chef":
            try:
                chef = target_user.userprofile.chef
                complaint_added = chef.add_complaint()
                result["complaint_added"] = complaint_added
                result["complaint_count"] = chef.complaint_count
                result["demotion_count"] = chef.demotion_count
            except (UserProfile.DoesNotExist, Chef.DoesNotExist):
                result["warning"] = "Could not find chef profile to add complaint"

        elif target_type == "delivery":
            try:
                delivery_person = target_user.userprofile.deliveryperson
                complaint_added = delivery_person.add_complaint()
                result["complaint_added"] = complaint_added
                result["complaint_count"] = delivery_person.complaint_count
                result["demotion_count"] = delivery_person.demotion_count
            except (UserProfile.DoesNotExist, DeliveryPerson.DoesNotExist):
                result["warning"] = "Could not find delivery person profile to add complaint"

    elif decision == "dismissed":
        # Complainant filed without merit - they get a warning
        complainant = complaint.complainant
        try:
            complainant_profile = complainant.userprofile
            if complainant_profile.user_type in ["registered", "vip"]:
                customer_profile = complainant_profile.customerprofile
                warnings_count = customer_profile.add_warning()
                result["complainant_warning"] = True
                result["complainant_warnings_count"] = warnings_count
                result["complainant_is_blacklisted"] = customer_profile.is_blacklisted
                result["complainant_user_type"] = complainant_profile.user_type
        except (UserProfile.DoesNotExist, CustomerProfile.DoesNotExist):
            result["complainant_warning_note"] = "Could not find complainant customer profile to add warning"

    return Response(result, status=200)


@api_view(["POST"])
@csrf_exempt
def process_compliment(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can process compliments"}, status=403)

    compliment_id = request.data.get("compliment_id")

    if not compliment_id:
        return Response({"error": "compliment_id is required"}, status=400)

    try:
        compliment = Compliment.objects.get(id=compliment_id)
    except Compliment.DoesNotExist:
        return Response({"error": "Compliment not found"}, status=404)

    if compliment.status != "pending":
        return Response({"error": "Compliment has already been processed"}, status=400)

    from django.utils import timezone

    compliment.status = "approved"
    compliment.processed_by = user
    compliment.processed_at = timezone.now()
    compliment.save()

    result = {"message": "Compliment approved", "compliment_id": compliment_id}

    target_type = compliment.target_type
    target_user = compliment.target_user

    if target_type == "chef":
        try:
            chef = target_user.userprofile.chef
            count_before = chef.compliment_count
            chef.add_compliment()
            result["compliment_count"] = chef.compliment_count
            # add_compliment() resets to 0 after hitting 3, so if it was 2 and now 0, bonus was awarded
            if count_before == 2 and chef.compliment_count == 0:
                result["bonus_awarded"] = True
        except (UserProfile.DoesNotExist, Chef.DoesNotExist):
            result["warning"] = "Could not find chef profile to add compliment"

    elif target_type == "delivery":
        try:
            delivery_person = target_user.userprofile.deliveryperson
            count_before = delivery_person.compliment_count
            delivery_person.add_compliment()
            result["compliment_count"] = delivery_person.compliment_count
            if count_before == 2 and delivery_person.compliment_count == 0:
                result["bonus_awarded"] = True
        except (UserProfile.DoesNotExist, DeliveryPerson.DoesNotExist):
            result["warning"] = "Could not find delivery person profile to add compliment"

    elif target_type == "customer":
        result["note"] = "Compliment recorded for customer"

    return Response(result, status=200)

@api_view(["POST"])
def blacklist_user(request):
    """Blacklist or unblacklist a customer. Action: 'blacklist' or 'unblacklist'"""
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can manage blacklist status"}, status=403)

    target_user_id = request.data.get("user_id")
    customer_id = request.data.get("customer_id")  # Alternative: use customer profile ID directly
    action = request.data.get("action", "blacklist")  # Default to blacklist for backwards compatibility

    if not target_user_id and not customer_id:
        return Response({"error": "Missing user_id or customer_id in request"}, status=400)

    try:
        if customer_id:
            cust_prof = CustomerProfile.objects.get(id=customer_id)
        else:
            cust_prof = CustomerProfile.objects.get(user_profile_id=target_user_id)
    except CustomerProfile.DoesNotExist:
        return Response({"error": "Customer profile not found"}, status=404)

    if action == "unblacklist":
        cust_prof.is_blacklisted = False
        cust_prof.warnings_count = 0  # Clear warnings when unblacklisting
        cust_prof.save()
        return Response({
            "message": "User unblacklisted successfully. Warnings have been cleared.",
            "user_id": target_user_id,
            "is_blacklisted": False
        }, status=200)
    else:
        cust_prof.is_blacklisted = True
        cust_prof.save()
        return Response({
            "message": "User blacklisted successfully",
            "user_id": target_user_id,
            "is_blacklisted": True
        }, status=200)


@api_view(["GET"])
def get_profile(request):
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    try:
        profile = user.userprofile
    except UserProfile.DoesNotExist:
        return Response({"error": "User profile not found"}, status=404)

    serializer = UserProfileSerializer(profile)
    return Response(serializer.data, status=200)


@api_view(["POST"])
def chat_with_ai(request):
    """
    First searches local KB for similar questions.
    If found, returns KB answer. If not, delegates to LLM.
    """
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    user_message = request.data.get("message")
    if not user_message:
        return Response({"error": "Message is required"}, status=400)

    # Step 1: Search KB first (case-insensitive search in questions)
    kb_match = KnowledgeBaseEntry.objects.filter(
        question__icontains=user_message,
        is_removed=False
    ).order_by('-rating_count').first()

    if kb_match:
        return Response({
            "response": kb_match.answer,
            "entry_id": kb_match.id,
            "source": "knowledge_base",
            "message": "Please rate this answer"
        })

    # Step 2: No KB match - delegate to LLM
    ollama_host = os.getenv("OLLAMA_HOST")
    ollama_key = os.getenv("OLLAMA_API_KEY")

    try:
        client = Client(
            host=ollama_host,
            headers={'Authorization': f'Bearer {ollama_key}'}
        )

        response = client.chat(model='gpt-oss:20b', messages=[
            {'role': 'user', 'content': user_message}
        ])

        bot_response = response['message']['content']

        kb_entry = KnowledgeBaseEntry.objects.create(
            author=user,
            author_type="customer",
            question=user_message,
            answer=bot_response,
            rating_sum=0,
            rating_count=0
        )

        return Response({
            "response": bot_response,
            "entry_id": kb_entry.id,
            "source": "llm"
        })

    except Exception as e:
        return Response({"error": f"AI Error: {str(e)}. Is Ollama running?"}, status=503)


@api_view(["POST"])
@csrf_exempt
def add_kb_entry(request):
    """
    Employees and customers can add knowledge to the KB.
    Employees: provide knowledge about the restaurant
    Customers: provide opinions and observations
    """
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = user.userprofile

    # Check if user is banned from contributing
    if not profile.can_contribute_knowledge:
        return Response({"error": "You are banned from contributing to the knowledge base"}, status=403)

    # Only employees and customers can contribute
    if profile.user_type not in ["registered", "vip", "chef", "delivery", "manager"]:
        return Response({"error": "Not authorized to contribute"}, status=403)

    question = request.data.get("question")
    answer = request.data.get("answer")

    if not question or not answer:
        return Response({"error": "question and answer are required"}, status=400)

    author_type = "employee" if profile.user_type in ["chef", "delivery", "manager"] else "customer"

    entry = KnowledgeBaseEntry.objects.create(
        author=user,
        author_type=author_type,
        question=question,
        answer=answer
    )

    return Response({
        "message": "Knowledge added successfully",
        "entry_id": entry.id
    }, status=201)


@api_view(["POST"])
def rate_kb_entry(request):
    """
    Rate an answer. If rating is 0, flag it for manager review.
    """
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    entry_id = request.data.get("entry_id")
    rating = request.data.get("rating") # Integer 0-5

    if entry_id is None or rating is None:
        return Response({"error": "entry_id and rating are required"}, status=400)

    try:
        entry = KnowledgeBaseEntry.objects.get(id=entry_id)
        
        # Security: Decide who can rate. For now, anyone logged in can rate.
        
        rating = int(rating)
        if rating < 0 or rating > 5:
            return Response({"error": "Rating must be 0-5"}, status=400)

        # 1. Update Rating Stats
        entry.rating_sum += rating
        entry.rating_count += 1

        # 2. Flagging Logic (Requirement: Flag if rating = 0)
        if rating == 0:
            entry.is_flagged = True
            entry.flagged_count += 1
        
        entry.save()

        return Response({
            "message": "Rating submitted",
            "new_average": entry.average_rating,
            "is_flagged": entry.is_flagged
        })

    except KnowledgeBaseEntry.DoesNotExist:
        return Response({"error": "Entry not found"}, status=404)


@api_view(["GET", "POST", "DELETE"])
def manage_kb(request):
    """
    Manager only: View flagged entries (GET) or delete bad ones (POST/DELETE).
    """
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    
    # Check if Manager
    if not hasattr(user, 'userprofile') or user.userprofile.user_type != 'manager':
        return Response({"error": "Managers only"}, status=403)

    # GET: List all flagged entries
    if request.method == "GET":
        flagged_entries = KnowledgeBaseEntry.objects.filter(is_flagged=True, is_removed=False)
        data = []
        for entry in flagged_entries:
            data.append({
                "id": entry.id,
                "question": entry.question,
                "answer": entry.answer,
                "author": entry.author.username if entry.author else "Unknown",
                "flagged_count": entry.flagged_count,
                "created_at": entry.created_at.strftime("%Y-%m-%d %H:%M") if entry.created_at else None
            })
        return Response({"entries": data})

    # POST/DELETE: Delete a specific entry and ban the author
    if request.method in ["POST", "DELETE"]:
        entry_id = request.data.get("entry_id")
        ban_author = request.data.get("ban_author", True)  # Default: ban the author

        if not entry_id:
            return Response({"error": "entry_id required"}, status=400)

        try:
            entry = KnowledgeBaseEntry.objects.get(id=entry_id)
            author = entry.author

            # Ban author from contributing if requested
            if ban_author and author and hasattr(author, 'userprofile'):
                author.userprofile.can_contribute_knowledge = False
                author.userprofile.save()

            entry.delete()
            return Response({
                "message": "Entry deleted successfully",
                "author_banned": ban_author and author is not None
            })
        except KnowledgeBaseEntry.DoesNotExist:
            return Response({"error": "Entry not found"}, status=404)
        
@api_view(["GET"])       
def AIDiscussionReview(request):
    user = request.user
    ai_summaries = []

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)


    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can see AI Summaries"}, status=403)
    
    menu_items = MenuItem.objects.all()
    for menu_item in menu_items:
        discussions = DiscussionTopic.objects.filter(related_dish=menu_item)
        if not discussions:
            continue
        for discussion in discussions:
            posts = discussion.posts.all()
            post_contents = [post.content for post in posts]
            dish_data = {
            "dish_id": discussion.related_dish.id,
            "dish_name": discussion.related_dish.name,
            "dish_comment": post_contents
        }
            print(post_contents)

        ai_response = call_ai_api(dish_data)


    # Save the AI summary to your response
        ai_summaries.append({
                "dish_id": discussion.related_dish.id,  # Fixed reference to `discussion.related_dish`
                "AI_summary": ai_response['message']['content']
            })


    return Response({
        "ai_summaries": ai_summaries
    })

def call_ai_api(data):
    ollama_host = os.getenv("OLLAMA_HOST")
    ollama_key = os.getenv("OLLAMA_API_KEY")

    client = Client(
        host=ollama_host,
        headers={'Authorization': f'Bearer {ollama_key}'}
    )

    # Make review bullets
    reviews_text = "\\n".join([f"- {c}" for c in data.get("dish_comment", [])])

    note = "Short summary of the reviews and provide a depiction of what customers think. Do NOT add any extra content of your own."

    # One-line content string
    content = f"{note}\\n\\nDish ID: {data['dish_id']}, Dish Name: {data['dish_name']}\\n\\nCustomer Reviews:\\n{reviews_text}"

    response = client.chat(
        model='gpt-oss:20b',
        messages=[{'role': 'user', 'content': content}]
    )

    return response       

@api_view(["POST"])
@csrf_exempt
def dispute_complaint(request):
    """
    Allow the target of a complaint to dispute it.
    The person has the right to dispute the complaint;
    the manager makes the final call to dismiss the complaint or let the warning stay.
    """
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    complaint_id = request.data.get("complaint_id")
    dispute_text = request.data.get("dispute_text")

    if not complaint_id:
        return Response({"error": "complaint_id is required"}, status=400)

    if not dispute_text or not dispute_text.strip():
        return Response({"error": "dispute_text is required"}, status=400)

    try:
        complaint = Complaint.objects.get(id=complaint_id)
    except Complaint.DoesNotExist:
        return Response({"error": "Complaint not found"}, status=404)

    # Only the target of the complaint can dispute it
    if complaint.target_user != user:
        return Response({"error": "You can only dispute complaints filed against you"}, status=403)

    # Can only dispute pending complaints
    if complaint.status != "pending":
        return Response({"error": "This complaint has already been processed and cannot be disputed"}, status=400)

    # Check if already disputed
    if complaint.dispute_text:
        return Response({"error": "This complaint has already been disputed"}, status=400)

    # Save the dispute
    complaint.dispute_text = dispute_text.strip()
    complaint.save()

    return Response({
        "message": "Dispute submitted successfully. The manager will review your dispute.",
        "complaint_id": complaint_id,
        "dispute_text": complaint.dispute_text
    }, status=200)


@api_view(["GET"])
def get_my_complaints(request):
    """
    Get complaints filed BY and AGAINST the current user.
    """
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    # Get complaints filed BY the user
    filed_complaints = Complaint.objects.filter(complainant=user).order_by('-created_at')
    filed_data = []
    for complaint in filed_complaints:
        filed_data.append({
            "id": complaint.id,
            "target": complaint.target_user.username,
            "target_type": complaint.target_type,
            "description": complaint.description,
            "status": complaint.status,
            "manager_decision": complaint.manager_decision,
            "created_at": complaint.created_at.strftime("%Y-%m-%d %H:%M"),
            "processed_at": complaint.processed_at.strftime("%Y-%m-%d %H:%M") if complaint.processed_at else None,
        })

    # Get complaints filed AGAINST the user
    received_complaints = Complaint.objects.filter(target_user=user).order_by('-created_at')
    received_data = []
    for complaint in received_complaints:
        received_data.append({
            "id": complaint.id,
            "complainant": complaint.complainant.username,
            "target_type": complaint.target_type,
            "description": complaint.description,
            "status": complaint.status,
            "dispute_text": complaint.dispute_text,
            "manager_decision": complaint.manager_decision,
            "created_at": complaint.created_at.strftime("%Y-%m-%d %H:%M"),
            "processed_at": complaint.processed_at.strftime("%Y-%m-%d %H:%M") if complaint.processed_at else None,
            "can_dispute": complaint.status == "pending" and not complaint.dispute_text
        })

    # Get compliments filed BY the user
    filed_compliments = Compliment.objects.filter(author=user).order_by('-created_at')
    compliments_data = []
    for compliment in filed_compliments:
        compliments_data.append({
            "id": compliment.id,
            "target": compliment.target_user.username,
            "target_type": compliment.target_type,
            "description": compliment.description,
            "status": compliment.status,
            "created_at": compliment.created_at.strftime("%Y-%m-%d %H:%M"),
            "processed_at": compliment.processed_at.strftime("%Y-%m-%d %H:%M") if compliment.processed_at else None,
        })

    return Response({
        "filed": filed_data,
        "received": received_data,
        "compliments": compliments_data
    }, status=200)

@api_view(["POST"])
@csrf_exempt
def hire_employee(request):
    """Manager hires a new chef or delivery person."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    serializer = HireEmployeeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    if User.objects.filter(username=data["username"]).exists():
        return Response({"error": "Username already exists"}, status=400)

    new_user = User.objects.create_user(
        username=data["username"],
        email=data["email"],
        password=data["password"]
    )
    UserProfile.objects.create(user=new_user, user_type=data["employee_type"])

    emp = new_user.userprofile.chef if data["employee_type"] == "chef" else new_user.userprofile.deliveryperson
    emp.salary = data["salary"]
    emp.save()

    return Response({"message": f"{data['employee_type'].capitalize()} hired", "id": emp.id}, status=201)


@api_view(["POST"])
@csrf_exempt
def fire_employee(request):
    """Manager fires a chef or delivery person."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    serializer = FireEmployeeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    Model = Chef if data["employee_type"] == "chef" else DeliveryPerson

    try:
        emp = Model.objects.get(id=data["employee_id"])
        username = emp.user_profile.user.username
        emp.user_profile.user.delete()
        return Response({"message": f"{data['employee_type'].capitalize()} '{username}' fired"}, status=200)
    except Model.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)


@api_view(["POST"])
@csrf_exempt
def update_salary(request):
    """Manager raises or cuts pay for employees."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    serializer = UpdateSalarySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    Model = Chef if data["employee_type"] == "chef" else DeliveryPerson

    try:
        emp = Model.objects.get(id=data["employee_id"])
        old_salary = emp.salary
        change = old_salary * (data["amount"] / 100) if data["is_percentage"] else data["amount"]
        emp.salary = old_salary + change if data["action"] == "raise" else max(Decimal("0"), old_salary - change)
        emp.save()
        return Response({"old_salary": str(old_salary), "new_salary": str(emp.salary)}, status=200)
    except Model.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)


@api_view(["POST"])
@csrf_exempt
def award_bonus(request):
    """Manager awards bonus to employee."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    serializer = AwardBonusSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    Model = Chef if data["employee_type"] == "chef" else DeliveryPerson

    try:
        emp = Model.objects.get(id=data["employee_id"])
        emp.salary += data["bonus_amount"]
        emp.save()
        return Response({"message": "Bonus awarded", "new_salary": str(emp.salary)}, status=200)
    except Model.DoesNotExist:
        return Response({"error": "Employee not found"}, status=404)


@api_view(["GET"])
def list_employees(request):
    """Manager views all employees."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    return Response({
        "chefs": ChefListSerializer(Chef.objects.all(), many=True).data,
        "delivery_persons": DeliveryPersonListSerializer(DeliveryPerson.objects.all(), many=True).data
    })


@api_view(["GET"])
def get_feedback_targets(request):
    """
    Get list of chefs, delivery people, and customers that users can file complaints/compliments about.
    This is a public endpoint for any authenticated user.
    """
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    # Get all chefs with basic info
    chefs = Chef.objects.select_related('user_profile__user').all()
    chef_data = [
        {
            "id": chef.id,
            "username": chef.user_profile.user.username,
        }
        for chef in chefs
    ]

    # Get all delivery people with basic info
    delivery_people = DeliveryPerson.objects.select_related('user_profile__user').all()
    delivery_data = [
        {
            "id": dp.id,
            "username": dp.user_profile.user.username,
        }
        for dp in delivery_people
    ]

    # Get all customers (excluding current user) for forum behavior complaints
    customers = CustomerProfile.objects.select_related('user_profile__user').exclude(
        user_profile__user=request.user
    )
    customer_data = [
        {
            "id": customer.id,
            "username": customer.user_profile.user.username,
        }
        for customer in customers
    ]

    return Response({
        "chefs": chef_data,
        "delivery_people": delivery_data,
        "customers": customer_data
    })


@api_view(["GET"])
def list_customers(request):
    """Manager views all customers."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    return Response({"customers": CustomerListSerializer(CustomerProfile.objects.all(), many=True).data})

@api_view(["POST"])
@csrf_exempt
def submit_registration_request(request):
    """Visitor submits registration request for manager approval."""
    from django.contrib.auth.hashers import make_password

    username = request.data.get("username")
    email = request.data.get("email")
    first_name = request.data.get("first_name")
    last_name = request.data.get("last_name")
    password = request.data.get("password")

    if not username or not email or not first_name or not last_name or not password:
        return Response({"error": "username, email, first_name, last_name, and password are required"}, status=400)

    if len(password) < 6:
        return Response({"error": "Password must be at least 6 characters"}, status=400)

    # Check if email is blacklisted
    if CustomerProfile.objects.filter(user_profile__user__email=email, is_blacklisted=True).exists():
        return Response({"error": "This email is blacklisted"}, status=403)

    # Check if username already exists
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already taken"}, status=400)

    # Check if email already exists
    if User.objects.filter(email=email).exists():
        return Response({"error": "Email already registered"}, status=400)

    # Check for pending requests
    if RegistrationRequest.objects.filter(email=email, status="pending").exists():
        return Response({"error": "A request with this email is already pending"}, status=400)

    if RegistrationRequest.objects.filter(username=username, status="pending").exists():
        return Response({"error": "A request with this username is already pending"}, status=400)

    req = RegistrationRequest.objects.create(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        password_hash=make_password(password)
    )
    return Response({"message": "Request submitted", "request_id": req.id}, status=201)


@api_view(["GET"])
def get_registration_requests(request):
    """Manager views pending registration requests."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    reqs = RegistrationRequest.objects.filter(status="pending").order_by('-created_at')

    # Build response with blacklist check
    data = []
    for req in reqs:
        # Check if this email belongs to a blacklisted customer
        is_blacklisted = CustomerProfile.objects.filter(
            user_profile__user__email=req.email,
            is_blacklisted=True
        ).exists()
        data.append({
            "id": req.id,
            "username": req.username,
            "email": req.email,
            "first_name": req.first_name,
            "last_name": req.last_name,
            "name": f"{req.first_name} {req.last_name}",  # For backward compatibility
            "created_at": req.created_at.strftime("%Y-%m-%d %H:%M") if req.created_at else None,
            "is_blacklisted": is_blacklisted
        })

    return Response({"requests": data})


@api_view(["POST"])
@csrf_exempt
def process_registration_request(request):
    """Manager approves or rejects registration request."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    serializer = ProcessRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    from django.utils import timezone

    try:
        req = RegistrationRequest.objects.get(id=data["request_id"], status="pending")
    except RegistrationRequest.DoesNotExist:
        return Response({"error": "Request not found or already processed"}, status=404)

    req.status = data["decision"]
    req.processed_by = request.user
    req.processed_at = timezone.now()
    req.save()

    if data["decision"] == "approved":
        # Check again that username/email aren't taken
        if User.objects.filter(username=req.username).exists():
            return Response({"error": "Username already taken"}, status=400)
        if User.objects.filter(email=req.email).exists():
            return Response({"error": "Email already registered"}, status=400)

        # Create user with the pre-hashed password from registration request
        new_user = User(
            username=req.username,
            email=req.email,
            first_name=req.first_name,
            last_name=req.last_name
        )
        new_user.password = req.password_hash  # Set the already-hashed password directly
        new_user.save()

        UserProfile.objects.create(user=new_user, user_type="registered")
        return Response({
            "message": "Approved",
            "user_id": new_user.id,
            "username": new_user.username
        }, status=200)

    return Response({"message": "Rejected"}, status=200)

@api_view(["POST"])
@csrf_exempt
def close_customer_account(request):
    """Manager closes customer account (kicked/quit), clears deposit."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    if request.user.userprofile.user_type != "manager":
        return Response({"error": "Manager access required"}, status=403)

    serializer = CloseAccountSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    try:
        customer = CustomerProfile.objects.get(id=data["customer_id"])
    except CustomerProfile.DoesNotExist:
        return Response({"error": "Customer not found"}, status=404)

    cleared = customer.deposit_balance
    customer.deposit_balance = Decimal("0")
    if data.get("reason") == "kicked":
        customer.is_blacklisted = True
    customer.save()

    customer.user_profile.user.is_active = False
    customer.user_profile.user.save()

    return Response({"message": "Account closed", "cleared_deposit": str(cleared), "is_blacklisted": customer.is_blacklisted}, status=200)


@api_view(["POST"])
@csrf_exempt
def customer_quit(request):
    """Customer voluntarily quits the system."""
    if not request.user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)

    profile = request.user.userprofile
    if profile.user_type not in ["registered", "vip"]:
        return Response({"error": "Only customers can quit"}, status=403)

    return Response({"message": "Quit request submitted. Manager will process your refund.", "deposit_balance": str(profile.customerprofile.deposit_balance)}, status=200)


# ============================================
# MENU SEARCH & RECOMMENDATIONS
# ============================================

@api_view(["GET"])
def search_menu(request):
    """Search menu items by name or description."""
    from django.db.models import Q

    query = request.GET.get("q", "")
    if not query:
        return Response({"error": "Search query 'q' is required"}, status=400)

    items = MenuItem.objects.filter(Q(name__icontains=query) | Q(description__icontains=query))

    # Filter VIP-exclusive for non-VIP users
    if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
        if request.user.userprofile.user_type != 'vip':
            items = items.filter(is_vip_exclusive=False)
    else:
        items = items.filter(is_vip_exclusive=False)

    return Response({
        "results": MenuSearchResultSerializer(items.distinct(), many=True).data,
        "count": items.count()
    })


@api_view(["GET"])
def get_recommendations(request):
    """
    Logged-in users: their most ordered + highest rated items.
    Visitors: most popular + highest-rated dishes globally.
    """
    from django.db.models import Count, Avg

    if request.user.is_authenticated and hasattr(request.user, 'userprofile'):
        profile = request.user.userprofile
        if profile.user_type in ['registered', 'vip']:
            customer = profile.customerprofile

            most_ordered = MenuItem.objects.filter(
                orderitem__order__customer=customer
            ).annotate(order_count=Count('orderitem')).order_by('-order_count')[:5]

            highest_rated = MenuItem.objects.filter(
                orderitem__ratings__customer=customer
            ).annotate(user_rating=Avg('orderitem__ratings__rating')).order_by('-user_rating')[:5]

            return Response({
                "personalized": True,
                "most_ordered": MenuSearchResultSerializer(most_ordered, many=True).data,
                "highest_rated": MenuSearchResultSerializer(highest_rated, many=True).data
            })

    # Visitors/new customers - global popular dishes
    most_popular = MenuItem.objects.filter(is_vip_exclusive=False).order_by('-total_orders')[:5]
    highest_rated = MenuItem.objects.filter(is_vip_exclusive=False, average_rating__gt=0).order_by('-average_rating')[:5]

    return Response({
        "personalized": False,
        "most_popular": MenuSearchResultSerializer(most_popular, many=True).data,
        "highest_rated": MenuSearchResultSerializer(highest_rated, many=True).data
    })


@api_view(["GET"])
def get_top_chefs(request):
    """Get most ordered chef and top-rated chef (may or may not be the same)."""
    from django.db.models import Sum

    most_ordered = Chef.objects.annotate(
        total_orders=Sum('menu_items__total_orders')
    ).order_by('-total_orders').first()

    top_rated = Chef.objects.filter(average_rating__gt=0).order_by('-average_rating').first()

    result = {}
    if most_ordered:
        result["most_ordered_chef"] = TopChefSerializer(most_ordered).data
    if top_rated:
        result["top_rated_chef"] = TopChefSerializer(top_rated).data
    if most_ordered and top_rated:
        result["same_chef"] = most_ordered.id == top_rated.id

    return Response(result)