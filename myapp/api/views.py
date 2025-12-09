from django.shortcuts import render, redirect
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
    ComplimentSerializer
)

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
    low_balance_alert = False
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
                
                # 2. The Logic: Is balance under $20?
                if current_balance < 20.00:
                    low_balance_alert = True

    # 3. Filter Menu Items (VIP vs Regular) - Preserving Group Logic
    items = MenuItem.objects.all()
    non_vip_items = MenuItem.objects.filter(is_vip_exclusive=False)
    
    if profile and profile.user_type == "vip":
        serializer = MenuItemSerializer(items, many=True)
    else:
        serializer = MenuItemSerializer(non_vip_items, many=True)

    # 4. Return the enhanced JSON
    return Response({
        "items": serializer.data,
        "user_info": {
            "warnings_count": warnings_count,
            "current_balance": str(current_balance), # Convert decimal to string for JSON
            "low_balance_alert": low_balance_alert
        }
    })

@api_view(["GET"])
def Discussions(request):
    titles = DiscussionTopic.objects.all()
    posts = DiscussionPost.objects.all()

    title_serializer = DiscussionTopicSerializer(titles, many=True)
    post_serializer = DiscussionPostSerializer(posts, many=True)

    return Response({
        "titles": title_serializer.data,
        "posts": post_serializer.data,
    })

@api_view(["POST"])
@csrf_exempt
def create_reply(request):
    serializer = DiscussionPostSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["POST"])   
@csrf_exempt
def create_topic(request):
    serializer = DiscussionTopicSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)

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
                return Response({
                    "error": "Insufficient funds", 
                    "current_balance": str(customer_profile.deposit_balance),
                    "order_total": str(grand_total)
                }, status=status.HTTP_402_PAYMENT_REQUIRED)

            # Deduct money
            customer_profile.deposit_balance -= grand_total
            customer_profile.total_spent += grand_total
            customer_profile.order_count += 1
            
            # Check for VIP upgrade (Your Logic)
            upgraded = customer_profile.check_vip_upgrade()
            customer_profile.save()

            # 5. SAVE ORDER (Combined Logic)
            order_serializer = OrderSerializer(data={
                "customer": customer_id,
                "total_price": grand_total,
                "status": "pending",
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
                response_data["message"] = "Congratulations! You have been upgraded to VIP status!"

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

    login(request, user)

    profile = user.userprofile  
    user_type = profile.user_type
    return Response({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "user_type": user_type
        }
    }, status=200)


@api_view(["POST"])
def create_delivery_bid(request):
    user  = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    
    profile = user.userprofile
    if profile.user_type !="manager":
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
    justification = request.data.get("justification_memo", "")

    selected_bid = DeliveryBid.objects.get(id=bid_id)
    lowest_bid = DeliveryBid.objects.filter(order_id=order_id).first()

    # Require justification if not choosing lowest bidder
    if selected_bid.id != lowest_bid.id and not justification:
        return Response({"error": "Justification memo required when not selecting lowest bidder"}, status=400)

    # Create assignment record
    DeliveryAssignment.objects.create(
        order_id=order_id,
        delivery_person=selected_bid.delivery_person,
        assigned_by=user,
        winning_bid=selected_bid,
        justification_memo=justification if selected_bid.id != lowest_bid.id else None
    )

    # Update order
    order = Order.objects.get(id=order_id)
    order.delivery_person = selected_bid.delivery_person
    order.delivery_bid_price = selected_bid.bid_amount
    order.status = "preparing"
    order.save()

    return Response({"message": "Delivery assigned", "order_id": order_id}, status=201)

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
    amount = intent.amount / 100  # Convert cents to dollars

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
        
        data.append({
            "order_id": order.id,
            "status": order.get_status_display(), # Shows "Pending" instead of "pending"
            "total_price": order.total_price,
            "date": order.created_at.strftime("%Y-%m-%d %H:%M"),
            "items_summary": ", ".join(item_names),
            "is_delivered": order.status == 'delivered'
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

    serializer = ComplaintSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(complainant=user, weight=weight, status="pending")
        return Response({
            "message": "Complaint filed successfully",
            "complaint": serializer.data
        }, status=201)

    return Response(serializer.errors, status=400)

@api_view(["GET"])
def get_complaints(request):
    user = request.user
    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)
    
    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can view complaints"}, status=403)
    
    pending_complaints = Complaint.objects.filter(status="pending")
    serializer = ComplaintSerializer(pending_complaints, many=True)
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

    serializer = ComplimentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(author=user, weight=weight, status="pending")
        return Response({
            "message": "Compliment filed successfully",
            "compliment": serializer.data
        }, status=201)

    return Response(serializer.errors, status=400)

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
    user = request.user

    if not user.is_authenticated:
        return Response({"error": "Authentication required"}, status=401)


    profile = user.userprofile
    if profile.user_type != "manager":
        return Response({"error": "Only managers can blacklist users"}, status=403)

    target_user_id = request.data.get("user_id")
    if not target_user_id:
        return Response({"error": "Missing user_id in request"}, status=400)

    try:
        cust_prof = CustomerProfile.objects.get(user_profile_id=target_user_id)
    except CustomerProfile.DoesNotExist:
        return Response({"error": "Customer profile not found"}, status=404)

    cust_prof.is_blacklisted = True
    cust_prof.save()

    return Response({
        "message": "User blacklisted successfully",
        "user_id": target_user_id,
        "is_blacklisted": True
    }, status=200)
