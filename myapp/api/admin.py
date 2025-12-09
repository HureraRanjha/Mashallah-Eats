from django.contrib import admin
from .models import (
    UserProfile, CustomerProfile, Chef, DeliveryPerson,
    MenuItem, Order, OrderItem,
    FoodRating, DeliveryRating,
    Complaint, Compliment,
    DeliveryBid, DeliveryAssignment,
    DiscussionTopic, DiscussionPost,
    KnowledgeBaseEntry, KnowledgeBaseRating,
    Transaction, PaymentMethod,
    RegistrationRequest
)

# Register your models here.

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'user_type', 'can_contribute_knowledge', 'created_at']
    list_filter = ['user_type']
    search_fields = ['user__username', 'user__email']

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_profile', 'warnings_count', 'order_count', 'total_spent', 'deposit_balance', 'is_blacklisted', 'vip_free_deliveries_remaining']
    list_filter = ['is_blacklisted', 'user_profile__user_type']
    search_fields = ['user_profile__user__username', 'default_address']

@admin.register(Chef)
class ChefAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_profile', 'salary', 'average_rating', 'complaint_count', 'compliment_count', 'demotion_count']
    list_filter = ['demotion_count']

@admin.register(DeliveryPerson)
class DeliveryPersonAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_profile', 'salary', 'average_rating', 'complaint_count', 'compliment_count', 'demotion_count']
    list_filter = ['demotion_count']

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'chef', 'price', 'is_vip_exclusive', 'average_rating', 'total_orders']
    list_filter = ['is_vip_exclusive', 'chef']
    search_fields = ['name', 'description']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'delivery_address', 'total_price', 'status', 'payment_status', 'delivery_person', 'is_free_delivery', 'created_at']
    list_filter = ['status', 'payment_status', 'is_free_delivery']
    search_fields = ['customer__user_profile__user__username', 'delivery_address']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'menu_item', 'quantity', 'price_at_time']

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ['id', 'complainant', 'target_user', 'target_type', 'target_chef', 'target_delivery', 'order', 'status', 'weight', 'processed_by', 'created_at']
    list_filter = ['status', 'target_type', 'weight']

@admin.register(Compliment)
class ComplimentAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'target_user', 'target_type', 'target_chef', 'target_delivery', 'order', 'status', 'weight', 'processed_by', 'created_at']
    list_filter = ['status', 'target_type']

@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'email', 'name', 'status', 'processed_by', 'created_at']
    list_filter = ['status']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'transaction_type', 'amount', 'order', 'payment_status', 'balance_after', 'timestamp']
    list_filter = ['transaction_type', 'payment_status']

@admin.register(FoodRating)
class FoodRatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'order_item', 'customer', 'rating', 'created_at']

@admin.register(DeliveryRating)
class DeliveryRatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'customer', 'rating', 'created_at']

@admin.register(DeliveryBid)
class DeliveryBidAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'delivery_person', 'bid_amount', 'created_at']

@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'delivery_person', 'assigned_by', 'winning_bid', 'assigned_at']

@admin.register(DiscussionTopic)
class DiscussionTopicAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'author', 'topic_type', 'related_chef', 'related_dish', 'related_delivery', 'created_at']
    list_filter = ['topic_type']

@admin.register(DiscussionPost)
class DiscussionPostAdmin(admin.ModelAdmin):
    list_display = ['id', 'topic', 'author', 'created_at']

@admin.register(KnowledgeBaseEntry)
class KnowledgeBaseEntryAdmin(admin.ModelAdmin):
    list_display = ['id', 'author', 'question', 'author_type', 'rating_sum', 'rating_count', 'is_flagged', 'is_removed', 'created_at']
    list_filter = ['author_type', 'is_flagged', 'is_removed']

@admin.register(KnowledgeBaseRating)
class KnowledgeBaseRatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'entry', 'user', 'rating', 'created_at']

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_profile', 'card_brand', 'last4', 'exp_month', 'exp_year', 'is_default', 'created_at']
