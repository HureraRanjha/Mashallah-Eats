from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError

# ============================================
# USER & PROFILE MODELS
# ============================================

class UserProfile(models.Model):
    USER_TYPES = [
        ('registered', 'Registered Customer'),
        ('vip', 'VIP Customer'),
        ('chef', 'Chef'),
        ('delivery', 'Delivery Person'),
        ('manager', 'Manager'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    user_type = models.CharField(max_length=20, choices=USER_TYPES)
    can_contribute_knowledge = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.user_type}"

    def get_customer_profile(self):
        """Safely get customer profile"""
        if self.user_type in ['registered', 'vip']:
            return getattr(self, 'customerprofile', None)
        return None

    def get_chef_profile(self):
        """Safely get chef profile"""
        if self.user_type == 'chef':
            return getattr(self, 'chef', None)
        return None

    def get_delivery_profile(self):
        """Safely get delivery profile"""
        if self.user_type == 'delivery':
            return getattr(self, 'deliveryperson', None)
        return None


class CustomerProfile(models.Model):
    """Only for registered and VIP customers"""
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    warnings_count = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    order_count = models.IntegerField(default=0)
    is_blacklisted = models.BooleanField(default=False)
    deposit_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vip_free_deliveries_remaining = models.IntegerField(default=0)
    default_address = models.TextField(blank=True, null=True)

    # Stripe fields
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, unique=True)

    def __str__(self):
        return f"Customer: {self.user_profile.user.username}"

    def check_vip_upgrade(self):
        """
        Check and upgrade to VIP if qualified.
        Requirements: $100+ spent OR 3+ orders, no blacklist, warnings < 3
        Returns: True if upgraded, False otherwise
        """
        if self.user_profile.user_type == 'registered':
            if (self.total_spent >= 100 or self.order_count >= 3) and not self.is_blacklisted and self.warnings_count < 3:
                self.user_profile.user_type = 'vip'
                self.user_profile.save()
                return True
        return False

    def add_warning(self):
        """
        Add a warning and handle consequences:
        - Registered: 3 warnings = deregistered (blacklisted)
        - VIP: 2 warnings = demoted to registered (warnings cleared)
        """
        self.warnings_count += 1

        # Check for deregistration (3 warnings for registered)
        if self.user_profile.user_type == 'registered' and self.warnings_count >= 3:
            self.is_blacklisted = True
            # Manager should close account and clear deposit

        # Check for VIP demotion (2 warnings for VIP)
        elif self.user_profile.user_type == 'vip' and self.warnings_count >= 2:
            self.user_profile.user_type = 'registered'
            self.user_profile.save()
            self.warnings_count = 0  # Clear warnings per requirements
            self.vip_free_deliveries_remaining = 0

        self.save()
        return self.warnings_count

    def remove_warning(self):
        """Remove a warning (e.g., when complaint is dismissed)"""
        if self.warnings_count > 0:
            self.warnings_count -= 1
            self.save()
        return self.warnings_count
 
    def track_free_delivery(self, order):
        """
        Track VIP free deliveries (1 free per 3 orders).
        Call this when an order is placed.
        Returns: True if this order gets free delivery, False otherwise
        """
        if self.user_profile.user_type == 'vip':
            # Check if customer has free delivery available
            if self.vip_free_deliveries_remaining > 0:
                self.vip_free_deliveries_remaining -= 1
                self.save()
                return True

            # Every 3 orders, grant a free delivery for the NEXT order
            completed_orders = self.order_count
            if completed_orders > 0 and completed_orders % 3 == 0:
                self.vip_free_deliveries_remaining += 1
                self.save()

        return False

    def apply_vip_discount(self, price):
        """
        Apply 5% VIP discount to price.
        Returns: discounted price if VIP, original price otherwise
        """
        if self.user_profile.user_type == 'vip':
            return price * 0.95  # 5% discount
        return price


# ============================================
# EMPLOYEE MODELS
# ============================================

class Chef(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    demotion_count = models.IntegerField(default=0)
    average_rating = models.FloatField(default=0.0)
    complaint_count = models.IntegerField(default=0)
    compliment_count = models.IntegerField(default=0)
    hired_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chef: {self.user_profile.user.username}"

    def add_complaint(self):
        """
        Add complaint. 3 complaints OR avg rating <2 = demotion.
        2 demotions = fired.
        """
        # Compliment can cancel a complaint
        if self.compliment_count > 0:
            self.compliment_count -= 1
            self.save()
            return False  # Complaint cancelled

        self.complaint_count += 1

        # Check for demotion (3 complaints OR consistently low ratings)
        if self.complaint_count >= 3 or self.average_rating < 2.0:
            self.demote()

        self.save()
        return True

    def add_compliment(self):
        """Add compliment. 3 compliments = bonus."""
        self.compliment_count += 1

        # Award bonus for 3 compliments
        if self.compliment_count >= 3:
            # Manager should award bonus
            self.compliment_count = 0  # Reset after bonus

        self.save()

    def demote(self):
        """Demote chef (lower salary). 2 demotions = fired."""
        self.demotion_count += 1
        self.complaint_count = 0  # Reset complaints after demotion

        if self.demotion_count >= 2:
            # Chef should be fired (manager action)
            return True  # Signal to fire

        # Lower salary by 10%
        self.salary = self.salary * 0.9
        self.save()
        return False

    def update_rating(self, new_rating):
        """Update average rating from food ratings."""
        self.average_rating = new_rating
        self.save()

        # Check if rating is too low
        if self.average_rating < 2.0:
            self.demote()


class DeliveryPerson(models.Model):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    demotion_count = models.IntegerField(default=0)
    average_rating = models.FloatField(default=0.0)
    complaint_count = models.IntegerField(default=0)
    compliment_count = models.IntegerField(default=0)
    hired_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Delivery: {self.user_profile.user.username}"

    def add_complaint(self):
        """
        Add complaint. 3 complaints OR avg rating <2 = demotion.
        2 demotions = fired.
        """
        # Compliment can cancel a complaint
        if self.compliment_count > 0:
            self.compliment_count -= 1
            self.save()
            return False  # Complaint cancelled

        self.complaint_count += 1

        # Check for demotion (3 complaints OR consistently low ratings)
        if self.complaint_count >= 3 or self.average_rating < 2.0:
            self.demote()

        self.save()
        return True

    def add_compliment(self):
        """Add compliment. 3 compliments = bonus."""
        self.compliment_count += 1

        # Award bonus for 3 compliments
        if self.compliment_count >= 3:
            # Manager should award bonus
            self.compliment_count = 0  # Reset after bonus

        self.save()

    def demote(self):
        """Demote delivery person (lower salary). 2 demotions = fired."""
        self.demotion_count += 1
        self.complaint_count = 0  # Reset complaints after demotion

        if self.demotion_count >= 2:
            # Delivery person should be fired (manager action)
            return True  # Signal to fire

        # Lower salary by 10%
        self.salary = self.salary * 0.9
        self.save()
        return False

    def update_rating(self, new_rating):
        """Update average rating from delivery ratings."""
        self.average_rating = new_rating
        self.save()

        # Check if rating is too low
        if self.average_rating < 2.0:
            self.demote()


# ============================================
# SIGNALS FOR AUTOMATIC PROFILE CREATION
# ============================================

@receiver(post_save, sender=UserProfile)
def create_role_profile(sender, instance, created, **kwargs):
    """Automatically create role-specific profiles when UserProfile is created"""
    if created:
        if instance.user_type in ['registered', 'vip']:
            CustomerProfile.objects.create(user_profile=instance)
        elif instance.user_type == 'chef':
            Chef.objects.create(
                user_profile=instance,
                salary=50000.00  # Default salary - adjust as needed
            )
        elif instance.user_type == 'delivery':
            DeliveryPerson.objects.create(
                user_profile=instance,
                salary=40000.00  # Default salary - adjust as needed
            )
        # Manager doesn't need additional profile


@receiver(post_save, sender=UserProfile)
def handle_role_change(sender, instance, created, **kwargs):
    """Handle role changes (e.g., registered -> vip)"""
    if not created:
        # If changing to customer type, ensure CustomerProfile exists
        if instance.user_type in ['registered', 'vip']:
            CustomerProfile.objects.get_or_create(user_profile=instance)

        # If changing to chef, ensure Chef profile exists
        elif instance.user_type == 'chef':
            Chef.objects.get_or_create(
                user_profile=instance,
                defaults={'salary': 50000.00}
            )

        # If changing to delivery, ensure DeliveryPerson profile exists
        elif instance.user_type == 'delivery':
            DeliveryPerson.objects.get_or_create(
                user_profile=instance,
                defaults={'salary': 40000.00}
            )


# ============================================
# MENU MODELS
# ============================================

class MenuItem(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    chef = models.ForeignKey(Chef, on_delete=models.CASCADE, related_name='menu_items')
    image_url = models.URLField(blank=True, null=True)
    is_vip_exclusive = models.BooleanField(default=False)
    average_rating = models.FloatField(default=0.0)
    total_orders = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} by {self.chef.user_profile.user.username}"


# ============================================
# ORDER MODELS
# ============================================

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('preparing', 'Preparing'),
        ('delivering', 'Delivering'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('requires_payment', 'Requires Payment'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]

    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='orders')
    delivery_address = models.TextField(default="")
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    delivery_person = models.ForeignKey(DeliveryPerson, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries')
    delivery_bid_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_free_delivery = models.BooleanField(default=False)  # For VIP tracking

    # Stripe fields
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Order #{self.id} by {self.customer.user_profile.user.username}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    price_at_time = models.DecimalField(max_digits=10, decimal_places=2)  # Capture price when ordered

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} in Order #{self.order.id}"


# ============================================
# RATING MODELS
# ============================================

class FoodRating(models.Model):
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='ratings')
    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 stars
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('order_item', 'customer')

    def __str__(self):
        return f"{self.rating}★ for {self.order_item.menu_item.name}"


class DeliveryRating(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='delivery_ratings')
    customer = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 stars
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('order', 'customer')

    def __str__(self):
        return f"{self.rating}★ for delivery of Order #{self.order.id}"


# ============================================
# REPUTATION SYSTEM MODELS
# ============================================

class Complaint(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('dismissed', 'Dismissed'),
        ('upheld', 'Upheld'),
    ]

    TARGET_TYPE_CHOICES = [
        ('chef', 'Chef'),
        ('delivery', 'Delivery Person'),
        ('customer', 'Customer'),
    ]

    complainant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints_filed')
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='complaints_received')
    target_type = models.CharField(max_length=20, choices=TARGET_TYPE_CHOICES)

    # Optional specific references
    target_chef = models.ForeignKey(Chef, on_delete=models.SET_NULL, null=True, blank=True)
    target_delivery = models.ForeignKey(DeliveryPerson, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)

    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    dispute_text = models.TextField(blank=True, null=True)
    manager_decision = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='complaints_processed')

    weight = models.IntegerField(default=1)  # 1 for regular, 2 for VIP
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Complaint by {self.complainant.username} against {self.target_user.username}"


class Compliment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
    ]

    TARGET_TYPE_CHOICES = [
        ('chef', 'Chef'),
        ('delivery', 'Delivery Person'),
        ('customer', 'Customer'),
    ]

    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliments_given')
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliments_received')
    target_type = models.CharField(max_length=20, choices=TARGET_TYPE_CHOICES)

    # Optional specific references
    target_chef = models.ForeignKey(Chef, on_delete=models.SET_NULL, null=True, blank=True)
    target_delivery = models.ForeignKey(DeliveryPerson, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)

    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='compliments_processed')

    weight = models.IntegerField(default=1)  # 1 for regular, 2 for VIP
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Compliment by {self.author.username} for {self.target_user.username}"


# ============================================
# DELIVERY BIDDING MODELS
# ============================================

class DeliveryBid(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='bids')
    delivery_person = models.ForeignKey(DeliveryPerson, on_delete=models.CASCADE, related_name='bids')
    bid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('order', 'delivery_person')
        ordering = ['bid_amount']

    def __str__(self):
        return f"Bid ${self.bid_amount} by {self.delivery_person.user_profile.user.username} for Order #{self.order.id}"


class DeliveryAssignment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='assignment')
    delivery_person = models.ForeignKey(DeliveryPerson, on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)  # Manager
    winning_bid = models.ForeignKey(DeliveryBid, on_delete=models.SET_NULL, null=True, blank=True)
    justification_memo = models.TextField(blank=True, null=True)  # If not lowest bidder
    assigned_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.order.id} assigned to {self.delivery_person.user_profile.user.username}"


# ============================================
# DISCUSSION FORUM MODELS
# ============================================

class DiscussionTopic(models.Model):
    TOPIC_TYPE_CHOICES = [
        ('chef', 'Chef'),
        ('dish', 'Dish'),
        ('delivery', 'Delivery Person'),
        ('general', 'General'),
    ]

    title = models.CharField(max_length=255)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='topics_created')
    topic_type = models.CharField(max_length=20, choices=TOPIC_TYPE_CHOICES)

    # Optional references
    related_chef = models.ForeignKey(Chef, on_delete=models.SET_NULL, null=True, blank=True)
    related_dish = models.ForeignKey(MenuItem, on_delete=models.SET_NULL, null=True, blank=True)
    related_delivery = models.ForeignKey(DeliveryPerson, on_delete=models.SET_NULL, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.author.username}"


class DiscussionPost(models.Model):
    topic = models.ForeignKey(DiscussionTopic, on_delete=models.CASCADE, related_name='posts')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='discussion_posts')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post by {self.author.username} in {self.topic.title}"


# ============================================
# KNOWLEDGE BASE MODELS
# ============================================

class KnowledgeBaseEntry(models.Model):
    AUTHOR_TYPE_CHOICES = [
        ('employee', 'Employee'),
        ('customer', 'Customer'),
    ]

    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    question = models.TextField()
    answer = models.TextField()
    author_type = models.CharField(max_length=20, choices=AUTHOR_TYPE_CHOICES)

    # Rating system
    rating_sum = models.IntegerField(default=0)
    rating_count = models.IntegerField(default=0)

    # Moderation
    is_flagged = models.BooleanField(default=False)
    is_removed = models.BooleanField(default=False)
    flagged_count = models.IntegerField(default=0)  # Count of 0-star ratings

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"KB: {self.question[:50]}..."

    @property
    def average_rating(self):
        if self.rating_count == 0:
            return None
        return self.rating_sum / self.rating_count


class KnowledgeBaseRating(models.Model):
    """Track who rated what to prevent duplicate ratings"""
    entry = models.ForeignKey(KnowledgeBaseEntry, on_delete=models.CASCADE, related_name='ratings')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(0, 'Outrageous'), (1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('entry', 'user')

    def __str__(self):
        return f"{self.user.username} rated KB entry {self.rating}"


# ============================================
# FINANCIAL MODELS
# ============================================

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ('deposit', 'Deposit'),
        ('withdrawal', 'Withdrawal'),
        ('order_payment', 'Order Payment'),
        ('refund', 'Refund'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True)

    # Stripe fields
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    stripe_charge_id = models.CharField(max_length=255, blank=True, null=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    stripe_error_message = models.TextField(blank=True, null=True)

    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} ${self.amount} by {self.user.username}"


class PaymentMethod(models.Model):
    """Optional: for saving customer payment methods"""
    customer_profile = models.ForeignKey(CustomerProfile, on_delete=models.CASCADE, related_name='payment_methods')
    stripe_payment_method_id = models.CharField(max_length=255, unique=True)
    card_brand = models.CharField(max_length=50)  # visa, mastercard, etc.
    last4 = models.CharField(max_length=4)
    exp_month = models.IntegerField()
    exp_year = models.IntegerField()
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.card_brand} ending in {self.last4}"


# ============================================
# REGISTRATION MODELS
# ============================================

class RegistrationRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='registrations_processed')
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Registration: {self.email} ({self.status})"


# ============================================
# LEGACY MODELS (Keep for backward compatibility - can be removed later)
# ============================================

class TestItem(models.Model):
    title = models.CharField(max_length=100)
    qty = models.IntegerField(default=0)
