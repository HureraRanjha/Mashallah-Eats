from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.views import LoginView
from django.views.decorators.csrf import csrf_exempt

from .models import MenuItem, DiscussionTopic, DiscussionPost, OrderItem
from .serializers import (
    MenuItemSerializer,
    DiscussionTopicSerializer,
    DiscussionPostSerializer,
    OrderSerializer,
    ItemSerializer,
    FoodReviewSerializer,
    AddMenuSerializer
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


