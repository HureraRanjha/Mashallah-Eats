# Model Methods Usage Guide

This guide shows how to use the business logic methods added to your models.

## CustomerProfile Methods

### 1. Check VIP Upgrade
```python
# After order completion
customer_profile = request.user.userprofile.customerprofile
if customer_profile.check_vip_upgrade():
    # Customer was upgraded to VIP!
    return Response({'message': 'Congratulations! You are now a VIP!'})
```

### 2. Add Warning
```python
# When manager upholds a complaint
customer_profile = target_user.userprofile.customerprofile
warnings = customer_profile.add_warning()

if customer_profile.is_blacklisted:
    # Customer has 3 warnings - deregister them
    return Response({'message': 'Customer deregistered due to warnings'})
elif customer_profile.user_profile.user_type == 'registered' and warnings == 0:
    # VIP was demoted to registered (warnings reset to 0)
    return Response({'message': 'VIP demoted to registered customer'})
```

### 3. Remove Warning
```python
# When manager dismisses a complaint
customer_profile.remove_warning()
```

### 4. Track Free Delivery (VIP)
```python
# When placing an order
customer_profile = request.user.userprofile.customerprofile
is_free = customer_profile.track_free_delivery(order)

if is_free:
    order.is_free_delivery = True
    order.delivery_bid_price = 0
```

### 5. Apply VIP Discount
```python
# When calculating order total
customer_profile = request.user.userprofile.customerprofile
original_price = 50.00
final_price = customer_profile.apply_vip_discount(original_price)
# If VIP: final_price = 47.50 (5% off)
```

## Chef Methods

### 1. Add Complaint
```python
# When manager upholds complaint against chef
chef = Chef.objects.get(user_profile__user=target_user)
complaint_added = chef.add_complaint()

if not complaint_added:
    # Complaint was cancelled by a compliment
    return Response({'message': 'Complaint cancelled by compliment'})

if chef.demotion_count >= 2:
    # Chef should be fired
    chef.delete()
    return Response({'message': 'Chef fired due to 2 demotions'})
```

### 2. Add Compliment
```python
# When customer compliments chef
chef = Chef.objects.get(user_profile__user=target_user)
chef.add_compliment()

if chef.compliment_count == 0:
    # Just reset to 0, meaning bonus awarded
    # Manager should give bonus
    return Response({'message': 'Chef receives bonus for 3 compliments!'})
```

### 3. Update Rating
```python
# After customer rates a dish
from django.db.models import Avg

chef = menu_item.chef
# Calculate new average rating from all food ratings
avg_rating = FoodRating.objects.filter(
    order_item__menu_item__chef=chef
).aggregate(Avg('rating'))['rating__avg'] or 0.0

chef.update_rating(avg_rating)
# Automatically checks if rating < 2 and demotes if needed
```

## DeliveryPerson Methods

Same as Chef methods:

### 1. Add Complaint
```python
delivery_person = DeliveryPerson.objects.get(user_profile__user=target_user)
complaint_added = delivery_person.add_complaint()

if delivery_person.demotion_count >= 2:
    delivery_person.delete()
    return Response({'message': 'Delivery person fired'})
```

### 2. Add Compliment
```python
delivery_person = DeliveryPerson.objects.get(user_profile__user=target_user)
delivery_person.add_compliment()
```

### 3. Update Rating
```python
from django.db.models import Avg

delivery_person = order.delivery_person
avg_rating = DeliveryRating.objects.filter(
    order__delivery_person=delivery_person
).aggregate(Avg('rating'))['rating__avg'] or 0.0

delivery_person.update_rating(avg_rating)
```

## Example View: Complete Order Flow

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Order, CustomerProfile

@api_view(['POST'])
def complete_order(request, order_id):
    order = Order.objects.get(id=order_id)
    customer_profile = order.customer

    # Mark order as delivered
    order.status = 'delivered'
    order.save()

    # Update customer stats
    customer_profile.order_count += 1
    customer_profile.total_spent += order.total_price
    customer_profile.save()

    # Check for VIP upgrade
    upgraded = customer_profile.check_vip_upgrade()

    # Track free deliveries for VIP
    if customer_profile.user_profile.user_type == 'vip':
        # For NEXT order
        if customer_profile.order_count % 3 == 0:
            customer_profile.vip_free_deliveries_remaining += 1
            customer_profile.save()

    if upgraded:
        return Response({
            'message': 'Order completed! You are now a VIP!',
            'order_id': order.id,
            'vip': True
        })

    return Response({
        'message': 'Order completed',
        'order_id': order.id
    })
```

## Example View: Manager Handles Complaint

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Complaint, CustomerProfile, Chef, DeliveryPerson

@api_view(['POST'])
def process_complaint(request, complaint_id):
    complaint = Complaint.objects.get(id=complaint_id)
    decision = request.data.get('decision')  # 'upheld' or 'dismissed'

    complaint.status = decision
    complaint.manager_decision = request.data.get('decision_text')
    complaint.processed_by = request.user
    complaint.save()

    if decision == 'upheld':
        # Add warning/complaint to target
        if complaint.target_type == 'customer':
            customer = CustomerProfile.objects.get(user_profile__user=complaint.target_user)
            customer.add_warning()

            if customer.is_blacklisted:
                return Response({'message': 'Customer blacklisted'})

        elif complaint.target_type == 'chef':
            chef = Chef.objects.get(user_profile__user=complaint.target_user)
            chef.add_complaint()

            if chef.demotion_count >= 2:
                chef.delete()
                return Response({'message': 'Chef fired'})

        elif complaint.target_type == 'delivery':
            delivery = DeliveryPerson.objects.get(user_profile__user=complaint.target_user)
            delivery.add_complaint()

            if delivery.demotion_count >= 2:
                delivery.delete()
                return Response({'message': 'Delivery person fired'})

    elif decision == 'dismissed':
        # Complainant gets a warning for false complaint
        complainant_profile = UserProfile.objects.get(user=complaint.complainant)
        if complainant_profile.user_type in ['registered', 'vip']:
            complainant_profile.customerprofile.add_warning()

    return Response({'message': 'Complaint processed'})
```

## Notes

1. **All methods automatically save** the model after making changes
2. **Warnings are automatically handled** - 3 for registered = blacklist, 2 for VIP = demotion
3. **Compliments cancel complaints** before being added
4. **Demotions reduce salary by 10%**
5. **2 demotions = fired** (you need to delete the employee in your view)
6. **VIP discount is 5%** - apply to order total
7. **VIP free delivery**: 1 free per 3 completed orders
