# Next Steps for Mashallah-Eats Backend

## ✅ What's Done
- [x] 18 Django models created and migrated to Supabase
- [x] Business logic methods added (VIP upgrade, warnings, complaints, etc.)
- [x] Django Admin configured for all models
- [x] Signals for automatic profile creation

## 📋 Immediate Next Steps

### 1. **Test Django Admin Panel** (5 minutes)
Create a superuser and verify models in admin:

```bash
python manage.py createsuperuser
# Enter username, email, password

python manage.py runserver
```

Then visit: http://127.0.0.1:8000/admin/
- Log in with superuser credentials
- Verify all 18 models appear
- Create test data (users, menu items, etc.)

---

### 2. **Create API Views** (Core Development)

You need to create REST API endpoints for:

#### **A. Authentication & Registration**
- `POST /api/register/` - Visitor applies for registration
- `POST /api/login/` - User login
- `POST /api/logout/` - User logout
- `GET /api/me/` - Get current user profile

#### **B. Customer Endpoints**
- `GET /api/menu/` - Browse menu (filtered by VIP status)
- `POST /api/orders/` - Place order
- `GET /api/orders/` - View order history
- `POST /api/orders/{id}/rate-food/` - Rate food
- `POST /api/orders/{id}/rate-delivery/` - Rate delivery
- `POST /api/deposit/` - Add money to deposit
- `GET /api/profile/` - View profile (warnings, balance, VIP status)

#### **C. Chef Endpoints**
- `GET /api/chef/menu-items/` - View my menu items
- `POST /api/chef/menu-items/` - Create menu item
- `PUT /api/chef/menu-items/{id}/` - Update menu item
- `GET /api/chef/performance/` - View ratings, complaints

#### **D. Delivery Person Endpoints**
- `GET /api/delivery/available-orders/` - View orders to bid on
- `POST /api/delivery/bid/` - Place bid on order
- `GET /api/delivery/my-deliveries/` - View assigned deliveries
- `PUT /api/delivery/deliveries/{id}/` - Update delivery status

#### **E. Manager Endpoints**
- `GET /api/manager/registration-requests/` - View pending registrations
- `POST /api/manager/registration-requests/{id}/approve/` - Approve registration
- `GET /api/manager/complaints/` - View all complaints
- `POST /api/manager/complaints/{id}/process/` - Process complaint
- `POST /api/manager/hire-chef/` - Hire new chef
- `POST /api/manager/fire-employee/{id}/` - Fire employee
- `POST /api/manager/assign-delivery/` - Assign delivery to bidder

#### **F. Discussion Forum**
- `GET /api/forum/topics/` - List topics
- `POST /api/forum/topics/` - Create topic
- `GET /api/forum/topics/{id}/posts/` - View posts
- `POST /api/forum/topics/{id}/posts/` - Add post

#### **G. Knowledge Base / AI Chatbot**
- `POST /api/chat/` - Ask question (search KB or use LLM)
- `POST /api/knowledge-base/` - Add knowledge entry
- `POST /api/knowledge-base/{id}/rate/` - Rate KB entry

---

### 3. **Implement Stripe Integration**

```bash
pip install stripe
```

Create payment views:
- Deposit money
- Process order payments
- Handle webhooks for payment confirmations

---

### 4. **Implement LLM Integration (AI Chatbot)**

Options:
- **Ollama** (local, free): `pip install ollama`
- **Hugging Face** (free tier): `pip install transformers`

Steps:
1. Search local knowledge base first
2. If no match, query LLM
3. Save user ratings on responses

---

### 5. **Create Serializers** (For REST API)

Create `api/serializers.py`:

```python
from rest_framework import serializers
from .models import UserProfile, CustomerProfile, MenuItem, Order

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'

class MenuItemSerializer(serializers.ModelSerializer):
    chef_name = serializers.CharField(source='chef.user_profile.user.username', read_only=True)

    class Meta:
        model = MenuItem
        fields = '__all__'

# ... etc for all models
```

---

### 6. **Set Up Permissions**

Create `api/permissions.py`:

```python
from rest_framework import permissions

class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.userprofile.user_type == 'manager'

class IsChef(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.userprofile.user_type == 'chef'

class IsCustomer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.userprofile.user_type in ['registered', 'vip']
```

---

### 7. **Frontend Integration**

Based on your project, you'll need to create views for:

1. **Visitor Landing Page**
   - Browse menu (most popular items)
   - Apply for registration
   - Ask chatbot questions

2. **Registered Customer Dashboard**
   - Personalized menu (most ordered items)
   - Order placement
   - Order history
   - Warnings display
   - Deposit management

3. **VIP Customer Dashboard**
   - Same as registered + VIP exclusive items
   - Free delivery tracker (X/3)
   - 5% discount displayed

4. **Chef Dashboard**
   - Manage menu items
   - View performance stats

5. **Delivery Dashboard**
   - Available orders
   - Bid on orders
   - Active deliveries

6. **Manager Dashboard**
   - Registration approvals
   - Complaint management
   - HR actions (hire/fire/salary)
   - Delivery assignment

---

### 8. **Creative Feature (15% of grade)**

Ideas from requirements:
- **Image-based food search** using YOLO/DINO
- **Voice ordering** system
- **Efficient route planning** for delivery
- **Real-time order tracking** with maps
- **Personalized recommendations** using ML

---

## 🛠️ Development Order (Recommended)

### Week 1: Authentication & Basic CRUD
1. User registration/login
2. Menu browsing (visitors + customers)
3. Basic order placement

### Week 2: Order Flow & Ratings
1. Order status updates
2. Food & delivery ratings
3. VIP upgrade logic
4. Delivery bidding system

### Week 3: Reputation & Management
1. Complaint/compliment system
2. Manager complaint processing
3. Warning system
4. HR actions (demote/fire)

### Week 4: Advanced Features
1. Discussion forums
2. Knowledge base + LLM integration
3. Stripe payment integration
4. Creative feature

### Week 5: Testing & Polish
1. Test all user flows
2. Fix bugs
3. Documentation
4. Deployment

---

## 📚 Useful Commands

```bash
# Run development server
python manage.py runserver

# Create migrations (if you change models)
python manage.py makemigrations
python manage.py migrate

# Access Django shell (for testing)
python manage.py shell

# Create test data
python manage.py shell
>>> from api.models import *
>>> # Create test users, orders, etc.
```

---

## 📖 Resources

- **Django REST Framework**: https://www.django-rest-framework.org/
- **Stripe Python**: https://stripe.com/docs/api/python
- **Supabase Docs**: https://supabase.com/docs
- **Model Methods Usage**: See `docs/model_methods_usage.md`

---

## ⚠️ Important Notes

1. **Don't commit sensitive data** (.env file with Supabase credentials)
2. **Test VIP upgrade logic** thoroughly
3. **Implement deposit checking** before allowing orders
4. **Handle edge cases** (blacklisted users, insufficient funds)
5. **VIP discount** should apply to `total_price` before saving order
6. **Free delivery** - set `delivery_bid_price = 0` if VIP has free delivery

---

## Need Help?

Check these files:
- `docs/model_methods_usage.md` - How to use business logic methods
- `api/models.py` - All model definitions
- `api/admin.py` - Admin panel configuration

Good luck with your project! 🚀
