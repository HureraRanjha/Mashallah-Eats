from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import MenuItem, DiscussionTopic, DiscussionPost, OrderItem, DeliveryBid, DeliveryAssignment, Order, FoodRating, DeliveryRating, UserProfile, CustomerProfile, Transaction, Chef
import stripe
from decimal import Decimal
from django.conf import settings

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
    DeliveryReviewSerializer
)

from rest_framework.decorators import api_view
from rest_framework.response import Response

def index(request):
    return HttpResponse("Hello from the backend API")

@api_view(["GET"])
def DishListView(request):
    user = request.user
    warnings = None
    profile = None 

    if user.is_authenticated and hasattr(user, "userprofile"):
        profile = user.userprofile
        if profile.user_type in ["registered", "vip"]:
            customer = getattr(profile, "customerprofile", None)
            if customer:
                warnings = customer.warnings_count

    items = MenuItem.objects.all()
    non_vip_items = MenuItem.objects.filter(is_vip_exclusive=False)
    if profile and profile.user_type == "vip":
        serializer = MenuItemSerializer(items, many=True)
    else:
        serializer = MenuItemSerializer(non_vip_items, many=True)

    return Response({
        "items": serializer.data,
        "warnings": warnings,
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
    data = request.data
    user = request.user
    profile = user.userprofile
    customer = profile.customerprofile
    # STEP 1 — Validate and create the Order (temporary total = 0)
    order_serializer = OrderSerializer(data={
        "customer": customer.id,
        "total_price": 0
    })

    if not order_serializer.is_valid():
        return Response(order_serializer.errors, status=400)

    order = order_serializer.save()

    total_price = 0
    created_items = []

    # STEP 2 — Loop through each item and create OrderItem manually
    for item in data["items"]:
        menu_item = MenuItem.objects.get(id=item["menu_item_id"])
        quantity = item["quantity"]
        price = menu_item.price

        # Calculate running total
        total_price += price * quantity

        # Create the OrderItem
        order_item = OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            quantity=quantity,
            price_at_time=price
        )

        created_items.append({
            "menu_item": menu_item.name,
            "quantity": quantity,
            "price_at_time": str(price)
        })

    # STEP 3 — Update the order total
    orders = Order.objects.filter(customer=customer)
    order_number = orders.count() + 1
    DELIVERY_FEE = Decimal("2.50")
    DRIVER_FEE = Decimal("1.00")
    total_price += DRIVER_FEE  # driver always gets paid

    # VIP benefits only
    if profile.user_type == "vip":

        # Every 3rd VIP order is free
        if order_number % 3 == 0:
            DELIVERY_FEE = Decimal("0.00")

        total_price += DELIVERY_FEE

        # VIP discount (5% off)
        total_price = total_price * Decimal("0.95")

    else:
        total_price += DELIVERY_FEE

    order.total_price = total_price.quantize(Decimal("0.01"))
    order.save()
    return Response({
    "order_id": order.id,
    "customer_id": customer.id,
    "items": created_items,
    "delivery_fee": str(DELIVERY_FEE),
    "driver_fee": str(DRIVER_FEE),
    "total_price": str(order.total_price),
    "status": order.status
    })

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

        chef.average_rating = chef_avg
        chef.save()
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

        delivery_person.average_rating = avg
        delivery_person.save()

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
