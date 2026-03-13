"""
Product Reviews Models

Comprehensive review and rating system for products
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from merchants.models import Product, Store
from django.db.models import Q, Count, Avg
from decimal import Decimal

User = get_user_model()


class ProductReview(models.Model):
    """Product review with ratings and feedback"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    is_verified_purchase = models.BooleanField(default=False)
    is_helpful_count = models.PositiveIntegerField(default=0)
    is_not_helpful_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['product', 'user']
        indexes = [
            models.Index(fields=['product', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['rating']),
            models.Index(fields=['is_verified_purchase']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.product.name} ({self.rating} stars)"
    
    @property
    def helpfulness_score(self):
        """Calculate helpfulness score"""
        total_votes = self.is_helpful_count + self.is_not_helpful_count
        if total_votes == 0:
            return 0
        return (self.is_helpful_count / total_votes) * 100
    
    @property
    def days_since_review(self):
        """Days since review was written"""
        return (timezone.now() - self.created_at).days
    
    def mark_helpful(self):
        """Mark review as helpful"""
        self.is_helpful_count += 1
        self.save()
    
    def mark_not_helpful(self):
        """Mark review as not helpful"""
        self.is_not_helpful_count += 1
        self.save()


class ReviewVote(models.Model):
    """Track user votes on review helpfulness"""
    review = models.ForeignKey(ProductReview, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='review_votes')
    vote_type = models.CharField(
        max_length=10,
        choices=[
            ('helpful', 'Helpful'),
            ('not_helpful', 'Not Helpful'),
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['review', 'user']
        indexes = [
            models.Index(fields=['review', 'vote_type']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.review.id} - {self.vote_type}"


class ReviewImage(models.Model):
    """Images associated with product reviews"""
    review = models.ForeignKey(ProductReview, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='review_images/')
    caption = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['review', 'is_primary']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Image for {self.review.id}"


class ReviewAnalytics(models.Model):
    """Analytics for product reviews"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='review_analytics')
    date = models.DateField()
    total_reviews = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    rating_distribution = models.JSONField(default=dict)  # {1: count, 2: count, 3: count, 4: count, 5: count}
    verified_purchase_reviews = models.PositiveIntegerField(default=0)
    total_helpful_votes = models.PositiveIntegerField(default=0)
    total_not_helpful_votes = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['product', 'date']
        indexes = [
            models.Index(fields=['product', 'date']),
            models.Index(fields=['date']),
        ]
    
    def __str__(self):
        return f"Analytics for {self.product.name} on {self.date}"


class ReviewResponse(models.Model):
    """Merchant responses to customer reviews"""
    review = models.OneToOneField(ProductReview, on_delete=models.CASCADE, related_name='response')
    merchant = models.ForeignKey(User, on_delete=models.CASCADE, related_name='review_responses')
    content = models.TextField()
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['review']),
            models.Index(fields=['merchant']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Response to {self.review.id} by {self.merchant.email}"


class ReviewFlag(models.Model):
    """Flagged reviews for moderation"""
    review = models.ForeignKey(ProductReview, on_delete=models.CASCADE, related_name='flags')
    flagger = models.ForeignKey(User, on_delete=models.CASCADE, related_name='flagged_reviews')
    reason = models.CharField(
        max_length=50,
        choices=[
            ('spam', 'Spam'),
            ('inappropriate', 'Inappropriate Content'),
            ('fake', 'Fake Review'),
            ('offensive', 'Offensive Language'),
            ('irrelevant', 'Irrelevant'),
            ('duplicate', 'Duplicate'),
            ('other', 'Other'),
        ]
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('reviewed', 'Reviewed'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
            ('removed', 'Removed'),
        ],
        default='pending'
    )
    moderator_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='moderated_flags')
    
    class Meta:
        indexes = [
            models.Index(fields=['review', 'status']),
            models.Index(fields=['flagger']),
            models.Index(fields=['reason']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Flag on {self.review.id} - {self.reason}"


class ReviewService:
    """Service for managing product reviews"""
    
    @staticmethod
    def create_review(user, product_id, rating, title, content, images=None):
        """Create a new product review"""
        with transaction.atomic():
            product = Product.objects.get(id=product_id)
            
            # Check if user already reviewed this product
            if ProductReview.objects.filter(product=product, user=user).exists():
                raise ValueError("You have already reviewed this product")
            
            # Create review
            review = ProductReview.objects.create(
                product=product,
                user=user,
                rating=rating,
                title=title,
                content=content,
                is_verified_purchase=ReviewService._check_verified_purchase(user, product)
            )
            
            # Add images if provided
            if images:
                for i, image_data in enumerate(images):
                    ReviewImage.objects.create(
                        review=review,
                        image=image_data,
                        is_primary=(i == 0)
                    )
            
            # Update product rating
            ReviewService._update_product_rating(product)
            
            # Update analytics
            ReviewService._update_review_analytics(product)
            
            return review
    
    @staticmethod
    def update_review(user, review_id, rating=None, title=None, content=None):
        """Update an existing review"""
        with transaction.atomic():
            review = ProductReview.objects.get(id=review_id, user=user)
            
            if rating is not None:
                review.rating = rating
            if title is not None:
                review.title = title
            if content is not None:
                review.content = content
            
            review.save()
            
            # Update product rating
            ReviewService._update_product_rating(review.product)
            
            return review
    
    @staticmethod
    def delete_review(user, review_id):
        """Delete a review"""
        with transaction.atomic():
            review = ProductReview.objects.get(id=review_id, user=user)
            product = review.product
            review.delete()
            
            # Update product rating
            ReviewService._update_product_rating(product)
    
    @staticmethod
    def vote_on_review(user, review_id, vote_type):
        """Vote on review helpfulness"""
        with transaction.atomic():
            review = ProductReview.objects.get(id=review_id)
            
            # Check if user already voted
            existing_vote = ReviewVote.objects.filter(review=review, user=user).first()
            
            if existing_vote:
                if existing_vote.vote_type == vote_type:
                    # Remove vote if same type
                    existing_vote.delete()
                    if vote_type == 'helpful':
                        review.is_helpful_count -= 1
                    else:
                        review.is_not_helpful_count -= 1
                else:
                    # Change vote type
                    if existing_vote.vote_type == 'helpful':
                        review.is_helpful_count -= 1
                        review.is_not_helpful_count += 1
                    else:
                        review.is_helpful_count += 1
                        review.is_not_helpful_count -= 1
                    
                    existing_vote.vote_type = vote_type
                    existing_vote.save()
            else:
                # Create new vote
                ReviewVote.objects.create(review=review, user=user, vote_type=vote_type)
                if vote_type == 'helpful':
                    review.is_helpful_count += 1
                else:
                    review.is_not_helpful_count += 1
            
            review.save()
            return review
    
    @staticmethod
    def get_product_reviews(product_id, sort_by='newest', verified_only=False, rating_filter=None):
        """Get reviews for a product"""
        queryset = ProductReview.objects.filter(product_id=product_id)
        
        if verified_only:
            queryset = queryset.filter(is_verified_purchase=True)
        
        if rating_filter:
            queryset = queryset.filter(rating=rating_filter)
        
        # Sort reviews
        if sort_by == 'newest':
            queryset = queryset.order_by('-created_at')
        elif sort_by == 'oldest':
            queryset = queryset.order_by('created_at')
        elif sort_by == 'highest':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort_by == 'lowest':
            queryset = queryset.order_by('rating', '-created_at')
        elif sort_by == 'most_helpful':
            queryset = queryset.order_by('-is_helpful_count', '-created_at')
        
        return queryset.select_related('user', 'product').prefetch_related('images', 'votes')
    
    @staticmethod
    def get_user_reviews(user, sort_by='newest'):
        """Get reviews by a user"""
        queryset = ProductReview.objects.filter(user=user)
        
        if sort_by == 'newest':
            queryset = queryset.order_by('-created_at')
        elif sort_by == 'oldest':
            queryset = queryset.order_by('created_at')
        elif sort_by == 'highest':
            queryset = queryset.order_by('-rating', '-created_at')
        elif sort_by == 'lowest':
            queryset = queryset.order_by('rating', '-created_at')
        
        return queryset.select_related('product').prefetch_related('images')
    
    @staticmethod
    def get_review_summary(product_id):
        """Get review summary for a product"""
        reviews = ProductReview.objects.filter(product_id=product_id)
        
        total_reviews = reviews.count()
        if total_reviews == 0:
            return {
                'total_reviews': 0,
                'average_rating': 0,
                'rating_distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
                'verified_purchase_percentage': 0,
                'helpful_percentage': 0
            }
        
        # Calculate rating distribution
        rating_dist = reviews.values('rating').annotate(count=Count('id'))
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for item in rating_dist:
            rating_distribution[item['rating']] = item['count']
        
        # Calculate average rating
        average_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0
        
        # Calculate verified purchase percentage
        verified_count = reviews.filter(is_verified_purchase=True).count()
        verified_percentage = (verified_count / total_reviews) * 100 if total_reviews > 0 else 0
        
        # Calculate helpful percentage
        total_votes = reviews.aggregate(
            total_helpful=Sum('is_helpful_count'),
            total_not_helpful=Sum('is_not_helpful_count')
        )
        total_helpful_votes = total_votes['total_helpful'] or 0
        total_not_helpful_votes = total_votes['total_not_helpful'] or 0
        all_votes = total_helpful_votes + total_not_helpful_votes
        helpful_percentage = (total_helpful_votes / all_votes) * 100 if all_votes > 0 else 0
        
        return {
            'total_reviews': total_reviews,
            'average_rating': float(average_rating),
            'rating_distribution': rating_distribution,
            'verified_purchase_percentage': verified_percentage,
            'helpful_percentage': helpful_percentage
        }
    
    @staticmethod
    def flag_review(user, review_id, reason, description=''):
        """Flag a review for moderation"""
        review = ProductReview.objects.get(id=review_id)
        
        # Check if user already flagged this review
        if ReviewFlag.objects.filter(review=review, flagger=user).exists():
            raise ValueError("You have already flagged this review")
        
        flag = ReviewFlag.objects.create(
            review=review,
            flagger=user,
            reason=reason,
            description=description
        )
        
        return flag
    
    @staticmethod
    def respond_to_review(merchant, review_id, content):
        """Merchant responds to a review"""
        with transaction.atomic():
            review = ProductReview.objects.get(id=review_id)
            
            # Check if merchant owns the product
            if review.product.store.user != merchant:
                raise ValueError("You can only respond to reviews of your own products")
            
            # Check if response already exists
            if ReviewResponse.objects.filter(review=review).exists():
                raise ValueError("You have already responded to this review")
            
            response = ReviewResponse.objects.create(
                review=review,
                merchant=merchant,
                content=content
            )
            
            return response
    
    @staticmethod
    def get_top_reviewers(limit=10):
        """Get users with most reviews"""
        return User.objects.annotate(
            review_count=Count('reviews')
        ).filter(
            review_count__gt=0
        ).order_by('-review_count')[:limit]
    
    @staticmethod
    def get_most_reviewed_products(limit=10):
        """Get products with most reviews"""
        return Product.objects.annotate(
            review_count=Count('reviews')
        ).filter(
            review_count__gt=0
        ).order_by('-review_count')[:limit]
    
    @staticmethod
    def get_highest_rated_products(limit=10, min_reviews=5):
        """Get highest rated products"""
        return Product.objects.annotate(
            review_count=Count('reviews'),
            avg_rating=Avg('reviews__rating')
        ).filter(
            review_count__gte=min_reviews
        ).order_by('-avg_rating')[:limit]
    
    @staticmethod
    def _check_verified_purchase(user, product):
        """Check if user has purchased this product"""
        # This would integrate with order system
        # from .models import Order
        # return Order.objects.filter(user=user, items__product=product, status='completed').exists()
        return False  # Placeholder
    
    @staticmethod
    def _update_product_rating(product):
        """Update product's average rating"""
        reviews = ProductReview.objects.filter(product=product)
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0
        
        # Update product model (assuming it has rating fields)
        # product.average_rating = avg_rating
        # product.review_count = reviews.count()
        # product.save()
    
    @staticmethod
    def _update_review_analytics(product):
        """Update review analytics"""
        today = timezone.now().date()
        
        # Get or create analytics record
        analytics, created = ReviewAnalytics.objects.get_or_create(
            product=product,
            date=today
        )
        
        # Update analytics data
        reviews = ProductReview.objects.filter(product=product)
        analytics.total_reviews = reviews.count()
        analytics.average_rating = reviews.aggregate(Avg('rating'))['rating__avg']
        
        # Update rating distribution
        rating_dist = reviews.values('rating').annotate(count=Count('id'))
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for item in rating_dist:
            rating_distribution[item['rating']] = item['count']
        analytics.rating_distribution = rating_distribution
        
        analytics.verified_purchase_reviews = reviews.filter(is_verified_purchase=True).count()
        analytics.total_helpful_votes = reviews.aggregate(Sum('is_helpful_count'))['is_helpful_count__sum'] or 0
        analytics.total_not_helpful_votes = reviews.aggregate(Sum('is_not_helpful_count'))['is_not_helpful_count__sum'] or 0
        
        analytics.save()


class ReviewModerationService:
    """Service for moderating reviews"""
    
    @staticmethod
    def get_flagged_reviews(status='pending'):
        """Get flagged reviews by status"""
        return ReviewFlag.objects.filter(status=status).select_related('review', 'flagger', 'review__user', 'review__product')
    
    @staticmethod
    def approve_flag(flag_id, moderator):
        """Approve a flagged review (no action needed)"""
        flag = ReviewFlag.objects.get(id=flag_id)
        flag.status = 'approved'
        flag.reviewed_at = timezone.now()
        flag.reviewed_by = moderator
        flag.save()
        
        return flag
    
    @staticmethod
    def reject_flag(flag_id, moderator, notes=''):
        """Reject a flagged review (no action needed)"""
        flag = ReviewFlag.objects.get(id=flag_id)
        flag.status = 'rejected'
        flag.moderator_notes = notes
        flag.reviewed_at = timezone.now()
        flag.reviewed_by = moderator
        flag.save()
        
        return flag
    
    @staticmethod
    def remove_review(flag_id, moderator, notes=''):
        """Remove a flagged review"""
        flag = ReviewFlag.objects.get(id=flag_id)
        review = flag.review
        product = review.product
        
        # Remove the review
        review.delete()
        
        # Update flag status
        flag.status = 'removed'
        flag.moderator_notes = notes
        flag.reviewed_at = timezone.now()
        flag.reviewed_by = moderator
        flag.save()
        
        # Update product rating
        ReviewService._update_product_rating(product)
        
        return flag
    
    @staticmethod
    def get_moderation_stats():
        """Get moderation statistics"""
        return {
            'pending_flags': ReviewFlag.objects.filter(status='pending').count(),
            'approved_flags': ReviewFlag.objects.filter(status='approved').count(),
            'rejected_flags': ReviewFlag.objects.filter(status='rejected').count(),
            'removed_reviews': ReviewFlag.objects.filter(status='removed').count(),
            'total_flags': ReviewFlag.objects.count()
        }
