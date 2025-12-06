from rest_framework import serializers
from .models import MenuItem, DiscussionTopic, DiscussionPost, Order, OrderItem, FoodRating


class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = "__all__"


class DiscussionTopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscussionTopic
        fields = "__all__"


class DiscussionPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscussionPost
        fields = "__all__"


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = "__all__"

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = "__all__"        


class FoodReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodRating
        fields = "__all__"        

class AddMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = "__all__"        