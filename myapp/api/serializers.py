from rest_framework import serializers
from .models import MenuItem, DiscussionTopic, DiscussionPost, Order, OrderItem, FoodRating, DeliveryBid, DeliveryAssignment


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

class DeliveryReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryRating
        fields = "__all__"        

class AddMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = "__all__"        

class DeliveryBidSerializer(serializers.ModelSerializer):
    delivery_person_name = serializers.SerializerMethodField()
    delivery_person_rating = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryBid
        fields = "__all__"

    def get_delivery_person_name(self, obj):
        return obj.delivery_person.user_profile.user.username

    def get_delivery_person_rating(self, obj):
        return obj.delivery_person.average_rating

class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    delivery_person_name = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryAssignment
        fields = "__all__"

    def get_delivery_person_name(self, obj):
        return obj.delivery_person.user_profile.user.username


class OrderWithBidsSerializer(serializers.ModelSerializer):
    bids = DeliveryBidSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"

    def get_customer_name(self, obj):
        return obj.customer.user_profile.user.username
    
    # def get_delivery_person_rating(self, obj):
    #     return obj.delivery_person.userprofile.average_rating