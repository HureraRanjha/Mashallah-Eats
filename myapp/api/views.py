from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.views import LoginView
from django.views.decorators.csrf import csrf_exempt

from .models import MenuItem, DiscussionTopic, DiscussionPost, OrderItem, DeliveryBid, DeliveryAssignment, Order
from .serializers import (
    MenuItemSerializer,
    DiscussionTopicSerializer,
    DiscussionPostSerializer,
    OrderSerializer,
    ItemSerializer,
    FoodReviewSerializer,
    AddMenuSerializer,
    DeliveryBidSerializer,
    DeliveryAssignmentSerializer,
    OrderWithBidsSerializer
)

from rest_framework.decorators import api_view
from rest_framework.response import Response

def index(request):
    return HttpResponse("Hello from the backend API")

@api_view(["GET"])
def DishListView(request):
    user = request.user
    warnings = None

    if user.is_authenticated and hasattr(user, "userprofile"):
        profile = user.userprofile
        if profile.user_type in ["registered", "vip"]:
            customer = getattr(profile, "customerprofile", None)
            if customer:
                warnings = customer.warnings_count

    items = MenuItem.objects.all()
    serializer = MenuItemSerializer(items, many=True)

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

    # STEP 1 — Validate and create the Order (temporary total = 0)
    order_serializer = OrderSerializer(data={
        "customer": data["customer_id"],
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
    order.total_price = total_price
    order.save()

    return Response({
        "order_id": order.id,
        "customer_id": data["customer_id"],
        "total_price": str(total_price),
        "items": created_items,
        "status": order.status
    })

@api_view(["POST"])
@csrf_exempt
def food_review(request):
    serializer = FoodReviewSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
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

class LoginUser(LoginView):
    template_name = "login.html"

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