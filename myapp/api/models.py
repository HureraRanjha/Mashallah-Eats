from django.db import models

class MenuItem(models.Model):
    id = models.AutoField(primary_key=True)   # <-- NORMAL ID, not BigAutoField
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.FloatField()

class TestItem(models.Model):
    title = models.CharField(max_length=100)
    qty = models.IntegerField(default=0)

from django.contrib.auth.models import User

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    # Task: Deposit table + balance field [cite: 650]
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_vip = models.BooleanField(default=False) 
    
    def __str__(self):
        return f"{self.user.username} - ${self.balance}"

# Signal to auto-create UserProfile when a User is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

class Order(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    # "Calculated total with VIP discounts" [cite: 585]
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
