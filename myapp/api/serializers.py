from rest_framework import serializers
from .models import MenuItem, DiscussionTopic, DiscussionPost, Order, OrderItem, FoodRating, DeliveryBid, DeliveryAssignment, DeliveryRating, Complaint, Compliment, UserProfile, CustomerProfile, Chef, DeliveryPerson, RegistrationRequest


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
        fields = ["order_item", "rating"]       

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


class ComplaintSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = "__all__"


class ComplimentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Compliment
        fields = "__all__"


# Profile Serializers
class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerProfile
        fields = "__all__"


class ChefProfileSerializer(serializers.ModelSerializer):
    menu_items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = Chef
        fields = "__all__"


class DeliveryPersonProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryPerson
        fields = "__all__"


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    customer = serializers.SerializerMethodField()
    chef = serializers.SerializerMethodField()
    delivery = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = "__all__"

    def get_customer(self, obj):
        if obj.user_type in ["registered", "vip"]:
            try:
                return CustomerProfileSerializer(obj.customerprofile).data
            except CustomerProfile.DoesNotExist:
                return None
        return None

    def get_chef(self, obj):
        if obj.user_type == "chef":
            try:
                return ChefProfileSerializer(obj.chef).data
            except Chef.DoesNotExist:
                return None
        return None

    def get_delivery(self, obj):
        if obj.user_type == "delivery":
            try:
                return DeliveryPersonProfileSerializer(obj.deliveryperson).data
            except DeliveryPerson.DoesNotExist:
                return None
        return None

class HireEmployeeSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    employee_type = serializers.ChoiceField(choices=["chef", "delivery"])
    salary = serializers.DecimalField(max_digits=10, decimal_places=2)


class FireEmployeeSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    employee_type = serializers.ChoiceField(choices=["chef", "delivery"])


class UpdateSalarySerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    employee_type = serializers.ChoiceField(choices=["chef", "delivery"])
    action = serializers.ChoiceField(choices=["raise", "cut"])
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_percentage = serializers.BooleanField(default=False)


class AwardBonusSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    employee_type = serializers.ChoiceField(choices=["chef", "delivery"])
    bonus_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    reason = serializers.CharField(required=False, allow_blank=True)


class ChefListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user_profile.user.username")
    email = serializers.EmailField(source="user_profile.user.email")
    menu_items_count = serializers.SerializerMethodField()

    class Meta:
        model = Chef
        fields = ["id", "username", "email", "salary", "average_rating",
                  "complaint_count", "compliment_count", "demotion_count",
                  "hired_at", "menu_items_count"]

    def get_menu_items_count(self, obj):
        return obj.menu_items.count()


class DeliveryPersonListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user_profile.user.username")
    email = serializers.EmailField(source="user_profile.user.email")
    deliveries_count = serializers.SerializerMethodField()

    class Meta:
        model = DeliveryPerson
        fields = ["id", "username", "email", "salary", "average_rating",
                  "complaint_count", "compliment_count", "demotion_count",
                  "hired_at", "deliveries_count"]

    def get_deliveries_count(self, obj):
        return obj.deliveries.count()


class CustomerListSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user_profile.user.username")
    email = serializers.EmailField(source="user_profile.user.email")
    user_type = serializers.CharField(source="user_profile.user_type")
    is_active = serializers.BooleanField(source="user_profile.user.is_active")

    class Meta:
        model = CustomerProfile
        fields = ["id", "username", "email", "user_type", "deposit_balance",
                  "total_spent", "order_count", "warnings_count",
                  "is_blacklisted", "is_active"]


class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = ["id", "email", "name", "status", "created_at"]


class ProcessRegistrationSerializer(serializers.Serializer):
    request_id = serializers.IntegerField()
    decision = serializers.ChoiceField(choices=["approved", "rejected"])
    password = serializers.CharField(required=False, allow_blank=True)


class CloseAccountSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField()
    reason = serializers.ChoiceField(choices=["kicked", "quit"], required=False)
