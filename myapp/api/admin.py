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
    list_display = ['user', 'user_type', 'created_at']
    list_filter = ['user_type']
    search_fields = ['user__username', 'user__email']

@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'warnings_count', 'order_count', 'total_spent', 'deposit_balance', 'is_blacklisted']
    list_filter = ['is_blacklisted', 'user_profile__user_type']
    search_fields = ['user_profile__user__username']

@admin.register(Chef)
class ChefAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'salary', 'average_rating', 'complaint_count', 'compliment_count', 'demotion_count']
    list_filter = ['demotion_count']

@admin.register(DeliveryPerson)
class DeliveryPersonAdmin(admin.ModelAdmin):
    list_display = ['user_profile', 'salary', 'average_rating', 'complaint_count', 'compliment_count', 'demotion_count']
    list_filter = ['demotion_count']

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'chef', 'price', 'is_vip_exclusive', 'average_rating', 'total_orders']
    list_filter = ['is_vip_exclusive', 'chef']
    search_fields = ['name', 'description']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'total_price', 'status', 'payment_status', 'created_at', 'delivery_person']
    list_filter = ['status', 'payment_status', 'is_free_delivery']
    search_fields = ['customer__user_profile__user__username']

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'menu_item', 'quantity', 'price_at_time']

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ['complainant', 'target_user', 'target_type', 'status', 'weight', 'created_at']
    list_filter = ['status', 'target_type', 'weight']

@admin.register(Compliment)
class ComplimentAdmin(admin.ModelAdmin):
    list_display = ['author', 'target_user', 'target_type', 'status', 'created_at']
    list_filter = ['status', 'target_type']

@admin.register(RegistrationRequest)
class RegistrationRequestAdmin(admin.ModelAdmin):
    list_display = ['email', 'name', 'status', 'created_at', 'processed_by']
    list_filter = ['status']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'transaction_type', 'amount', 'payment_status', 'timestamp']
    list_filter = ['transaction_type', 'payment_status']

admin.site.register(FoodRating)
admin.site.register(DeliveryRating)
admin.site.register(DeliveryBid)
admin.site.register(DeliveryAssignment)
admin.site.register(DiscussionTopic)
admin.site.register(DiscussionPost)
admin.site.register(KnowledgeBaseEntry)
admin.site.register(KnowledgeBaseRating)
admin.site.register(PaymentMethod)
