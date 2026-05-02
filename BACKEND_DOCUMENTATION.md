# Product Nerve AI - Backend API Documentation

## Overview

Product Nerve AI is a comprehensive AI-powered product development platform that provides structured venture building through multiple phases, user management, billing, and administrative oversight. This document outlines all required backend endpoints, data models, and integrations based on the frontend implementation.

## Table of Contents

Phase 1. [Authentication & Authorization](#authentication--authorization)
Phase 2. [User Management](#user-management)
Phase 3. [Workspace Management](#workspace-management)
Phase 4. [Project Management](#project-management)
Phase 5. [Studio Tools](#studio-tools)
Phase 6. [Billing & Payments](#billing--payments)
Phase 7. [Admin Panel](#admin-panel)
Phase 8. [Analytics & Tracking](#analytics--tracking)
Phase 9. [Notifications](#notifications)
Phase 10. [Content Management](#content-management)
Phase 11. [File Storage](#file-storage)
Phase 12. [Data Models & Schemas](#data-models--schemas)

---

## Authentication & Authorization

### Core Endpoints

#### POST `/api/auth/signup`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Inc."
}
```

#### POST `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/logout`
- Headers: `Authorization: Bearer <token>`
- Clears session and invalidates token

#### POST `/api/auth/forgot-password`
```json
{
  "email": "user@example.com"
}
```

#### POST `/api/auth/reset-password`
```json
{
  "token": "reset_token_here",
  "password": "new_password123"
}
```

#### GET `/api/auth/me`
- Headers: `Authorization: Bearer <token>`
- Returns current user profile

### JWT Token Structure
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "user|admin",
  "exp": 1234567890,
  "iat": 1234567890
}
```

---

## User Management

### User Profile Schema
```typescript
interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name?: string;
  plan_type: "free" | "project_unlock" | "pro" | "enterprise";
  subscription_plan?: "pro" | "enterprise";
  subscription_status: "active" | "cancelled" | "inactive" | "past_due";
  subscription_start?: string;
  subscription_end?: string;
  workspace_limit?: number;
  project_limit?: number;
  max_workspaces?: number;
  max_projects_per_workspace?: number;
  report_access: boolean;
  tool_access: boolean;
  user_status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}
```

### Endpoints

#### GET `/api/users/profile`
- Headers: `Authorization: Bearer <token>`
- Returns current user profile

#### PUT `/api/users/profile`
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Acme Inc."
}
```

#### GET `/api/users/limits`
- Returns plan limits and current usage

#### GET `/api/users/:id`
- Admin only: Get specific user details

#### PUT `/api/users/:id/status`
- Admin only: Update user status (active/inactive)

---

## Workspace Management

### Workspace Schema
```typescript
interface Workspace {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
}
```

### Endpoints

#### GET `/api/workspaces`
- Headers: `Authorization: Bearer <token>`
- Returns user's workspaces

#### POST `/api/workspaces`
```json
{
  "name": "New Workspace",
  "description": "Workspace description"
}
```

#### PUT `/api/workspaces/:id`
```json
{
  "name": "Updated Workspace",
  "description": "Updated description"
}
```

#### DELETE `/api/workspaces/:id`
- Deletes workspace (cascades to projects)

#### GET `/api/workspaces/:id/projects`
- Returns projects in specific workspace

---

## Project Management

### Project Schema
```typescript
interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  status: "planning" | "ideation" | "validation" | "execution" | "growth" | "paused" | "completed";
  stage: "planning" | "ideation" | "validation" | "execution" | "growth";
  overall_score?: number;
  phase1_status: "not_started" | "in_progress" | "complete";
  phase2_status: "not_started" | "in_progress" | "complete";
  phase3_status: "not_started" | "in_progress" | "complete";
  project_locked: boolean;
  project_unlocked_at?: string;
  unlock_type?: "payment" | "subscription";
  created_at: string;
  updated_at: string;
}
```

### Project Phases

#### Phase 1: Product Context
```typescript
interface ProductContext {
  product: string;
  core_problem: string;
  who_experiences: string;
  industries_affected: string[];
}
```

#### Phase 2: Segment Identification
```typescript
interface ICPSegment {
  name: string;
  job_role: string;
  industry: string;
  company_size: string;
  geography: string;
  income_level: string;
  pain_profile: {
    top_problems: string[];
    current_workaround: string;
    cost_of_problem: string;
    urgency_level: string;
    emotional_trigger: string;
  };
  buying_behavior: {
    decision_maker: string;
    budget_authority: string;
    buying_triggers: string;
    buying_frequency: string;
    price_sensitivity: string;
  };
  channel_discovery: {
    communities: string[];
    social_platforms: string[];
    search_behavior: string;
    industry_events: string[];
    referrals: string[];
  };
}
```

#### Phase 3: Pain Profile
```typescript
interface PainProfile {
  top_problems: string[];
  current_solution: string;
  pain_intensity_score: number;
  purchase_probability: number;
  revenue_potential: "Low" | "Medium" | "High";
  persona_summary: string;
  strategic_insights: string;
  best_channels: string[];
}
```

### Endpoints

#### GET `/api/projects`
- Headers: `Authorization: Bearer <token>`
- Query params: `workspace_id`, `status`, `stage`, `sort`

#### POST `/api/projects`
```json
{
  "workspace_id": "workspace_id",
  "name": "Project Name",
  "description": "Project description"
}
```

#### GET `/api/projects/:id`
- Returns specific project details

#### PUT `/api/projects/:id`
- Updates project details

#### DELETE `/api/projects/:id`
- Deletes project

#### GET `/api/projects/:id/context`
- Returns Phase 1 data

#### PUT `/api/projects/:id/context`
- Updates Phase 1 data

#### GET `/api/projects/:id/segments`
- Returns Phase 2 segments

#### POST `/api/projects/:id/segments`
```json
{
  "name": "Segment Name",
  "job_role": "CTO",
  "industry": "Technology",
  "company_size": "50-100",
  "pain_profile": {...}
}
```

#### GET `/api/projects/:id/pains`
- Returns Phase 3 pain profiles

#### POST `/api/projects/:id/pains`
```json
{
  "segment_id": "segment_id",
  "top_problems": ["Problem 1", "Problem 2"],
  "purchase_probability": 75,
  "revenue_potential": "High"
}
```

#### POST `/api/projects/:id/unlock`
```json
{
  "unlock_type": "payment" | "subscription",
  "payment_method_id": "pm_123"
}
```

---

## Studio Tools

### Tool Usage Tracking
```typescript
interface ToolUsage {
  id: string;
  user_id: string;
  project_id?: string;
  tool_type: "icp_builder" | "experiment_engine" | "growth_engine" | "roadmap_generator" | "user_story_generator" | "prd_generator";
  usage_count: number;
  session_duration: number;
  created_at: string;
}
```

### Endpoints

#### GET `/api/studio/analytics`
- Returns tool usage statistics

#### GET `/api/studio/icp-builder/:project_id`
- Returns ICP data for project

#### POST `/api/studio/icp-builder/:project_id`
```json
{
  "product_context": {...},
  "segments": [...]
}
```

#### GET `/api/studio/experiment-engine/:project_id`
- Returns experiment data

#### POST `/api/studio/experiment-engine/:project_id`
```json
{
  "hypothesis": "Test hypothesis",
  "variables": [...],
  "success_metrics": [...]
}
```

#### GET `/api/studio/growth-engine/:project_id`
- Returns growth experiment data

#### POST `/api/studio/growth-engine/:project_id`
```json
{
  "experiment_type": "A/B Test",
  "target_audience": "...",
  "success_criteria": "..."
}
```

#### GET `/api/studio/roadmap-generator/:project_id`
- Returns roadmap data

#### POST `/api/studio/roadmap-generator/:project_id`
```json
{
  "features": [...],
  "timeline": "Q1 2024",
  "priority": "high"
}
```

#### GET `/api/studio/user-stories/:project_id`
- Returns user story data

#### POST `/api/studio/user-stories/:project_id`
```json
{
  "user_story": "As a user, I want...",
  "acceptance_criteria": [...],
  "priority": "medium"
}
```

#### GET `/api/studio/prd-generator/:project_id`
- Returns PRD data

#### POST `/api/studio/prd-generator/:project_id`
```json
{
  "product_requirements": [...],
  "technical_specifications": {...},
  "success_metrics": [...]
}
```

#### GET `/api/studio/artifacts/:project_id`
- Returns all generated artifacts

---

## Billing & Payments

### Payment Schema
```typescript
interface Payment {
  id: string;
  user_id: string;
  payment_type: "project_unlock" | "pro_subscription" | "enterprise_subscription";
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  payment_method_id?: string;
  coupon_used?: string;
  created_at: string;
  updated_at: string;
}
```

### Coupon Schema
```typescript
interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_amount?: number;
  max_uses?: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  created_at: string;
}
```

### Subscription Plans

#### Free Plan
- 1 workspace
- 1 project per workspace
- Basic features only

#### Project Unlock ($11.75)
- 1 workspace
- 2 projects per workspace
- Unlock specific projects

#### Pro Plan ($16.99/month)
- 2 workspaces
- 3 projects per workspace
- All studio tools
- Advanced analytics

#### Enterprise (Custom)
- Unlimited workspaces
- Unlimited projects
- Priority support
- Custom features

### Endpoints

#### GET `/api/billing/subscription`
- Returns current subscription status

#### GET `/api/billing/payments`
- Returns payment history

#### POST `/api/billing/subscribe`
```json
{
  "plan": "pro" | "enterprise",
  "payment_method_id": "pm_123",
  "coupon_code": "DISCOUNT10"
}
```

#### POST `/api/billing/unlock-project`
```json
{
  "project_id": "project_id",
  "payment_method_id": "pm_123"
}
```

#### POST `/api/billing/cancel`
- Cancels current subscription

#### GET `/api/billing/coupons/:code`
- Validates coupon code

#### GET `/api/billing/payment-methods`
- Returns saved payment methods

#### POST `/api/billing/payment-methods`
```json
{
  "type": "card" | "bank_account",
  "provider": "stripe" | "paypal",
  "token": "payment_method_token"
}
```

---

## Admin Panel

### Admin Roles
```typescript
type AdminRole = "super_admin" | "product_analyst" | "support_specialist" | "growth_analyst";
```

### Permission Matrix

#### Super Admin
- Full access to all admin features

#### Product Analyst
- Analytics, Users, KYC, Contacts, Communications, Content, Studio Analytics, Studio Content

#### Support Specialist
- Contacts, Communications, Content

#### Growth Analyst
- Analytics, Users, Contacts, Communications, Content, Studio Analytics, Studio Activity

### Admin Endpoints

#### Authentication
- POST `/api/admin/login`
- GET `/api/admin/me`

#### Analytics
- GET `/api/admin/analytics/platform`
- GET `/api/admin/analytics/product`
- GET `/api/admin/analytics/growth`
- GET `/api/admin/analytics/studio`

#### User Management
- GET `/api/admin/users`
- PUT `/api/admin/users/:id`
- DELETE `/api/admin/users/:id`
- POST `/api/admin/users/:id/promote`

#### Workspace Management
- GET `/api/admin/workspaces`
- PUT `/api/admin/workspaces/:id`
- DELETE `/api/admin/workspaces/:id`

#### KYC Management
- GET `/api/admin/kyc`
- PUT `/api/admin/kyc/:id/approve`
- PUT `/api/admin/kyc/:id/reject`

#### Billing Management
- GET `/api/admin/billing/payments`
- GET `/api/admin/billing/coupons`
- POST `/api/admin/billing/coupons`
- PUT `/api/admin/billing/coupons/:id`
- DELETE `/api/admin/billing/coupons/:id`

#### Contact Center
- GET `/api/admin/contacts/tickets`
- POST `/api/admin/contacts/tickets`
- PUT `/api/admin/contacts/tickets/:id`
- POST `/api/admin/contacts/tickets/:id/reply`
- GET `/api/admin/contacts/feedback`
- PUT `/api/admin/contacts/feedback/:id/status`

#### Communications
- GET `/api/admin/communications/broadcasts`
- POST `/api/admin/communications/broadcasts`
- GET `/api/admin/communications/notifications`
- POST `/api/admin/communications/notifications`
- PUT `/api/admin/communications/notifications/:id/resend`
- PUT `/api/admin/communications/notifications/:id/archive`
- DELETE `/api/admin/communications/notifications/:id`

#### Content Management
- GET `/api/admin/content/pages`
- POST `/api/admin/content/pages`
- PUT `/api/admin/content/pages/:id`
- DELETE `/api/admin/content/pages/:id`
- GET `/api/admin/content/blog-posts`
- POST `/api/admin/content/blog-posts`
- PUT `/api/admin/content/blog-posts/:id`
- DELETE `/api/admin/content/blog-posts/:id`
- PUT `/api/admin/content/blog-posts/:id/publish`

---

## Analytics & Tracking

### Event Tracking Schema
```typescript
interface TrackingEvent {
  event: string;
  user_id?: string;
  session_id: string;
  timestamp: string;
  referrer: string;
  page_url: string;
  page_path: string;
  device_type: "mobile" | "desktop";
  browser: string;
  os: string;
  utm_first_touch: Record<string, string>;
  utm_last_touch: Record<string, string>;
  properties?: Record<string, any>;
}
```

### Required Events

#### User Events
- `signup_started`
- `signup_completed`
- `login`
- `logout`
- `page_view`

#### Project Events
- `project_created`
- `project_updated`
- `project_deleted`
- `project_unlocked`
- `phase_completed`

#### Tool Events
- `icp_builder_used`
- `experiment_engine_used`
- `growth_engine_used`
- `roadmap_generator_used`
- `user_story_generator_used`
- `prd_generator_used`

#### Billing Events
- `payment_initiated`
- `payment_completed`
- `payment_failed`
- `subscription_started`
- `subscription_cancelled`
- `coupon_used`

### Tracking Endpoints

#### POST `/api/analytics/events`
```json
{
  "events": [...],
  "session_id": "session_123"
}
```

#### GET `/api/analytics/attribution/:user_id`
- Returns user's attribution data

---

## Notifications

### Notification Schema
```typescript
interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  channel: "in_app" | "email" | "push";
  priority: "low" | "medium" | "high";
  sent_status: "pending" | "sent" | "failed" | "archived";
  action_url?: string;
  link?: string;
  created_at: string;
}
```

### Support Ticket Schema
```typescript
interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: "low" | "medium" | "high";
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  updated_at: string;
}
```

### Endpoints

#### GET `/api/notifications`
- Headers: `Authorization: Bearer <token>`
- Returns user notifications

#### PUT `/api/notifications/:id/read`
- Marks notification as read

#### DELETE `/api/notifications/:id`
- Deletes notification

#### GET `/api/support/tickets`
- Returns user's support tickets

#### POST `/api/support/tickets`
```json
{
  "subject": "Issue with project",
  "message": "Detailed description...",
  "priority": "medium"
}
```

#### GET `/api/support/tickets/:id`
- Returns specific ticket with replies

#### POST `/api/support/tickets/:id/reply`
```json
{
  "message": "Reply message..."
}
```

---

## Content Management

### Blog Post Schema
```typescript
interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  tags: string[];
  cover_image_url?: string;
  is_published: boolean;
  published_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

### Content Page Schema
```typescript
interface ContentPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}
```

### Endpoints

#### GET `/api/content/blog-posts`
- Public: Returns published blog posts
- Admin: Returns all blog posts

#### GET `/api/content/blog-posts/:slug`
- Returns specific blog post

#### POST `/api/content/blog-posts`
- Admin only: Create new blog post

#### PUT `/api/content/blog-posts/:id`
- Admin only: Update blog post

#### DELETE `/api/content/blog-posts/:id`
- Admin only: Delete blog post

#### GET `/api/content/pages`
- Public: Returns published pages
- Admin: Returns all pages

#### GET `/api/content/pages/:slug`
- Returns specific page

#### POST `/api/content/pages`
- Admin only: Create new page

#### PUT `/api/content/pages/:id`
- Admin only: Update page

#### DELETE `/api/content/pages/:id`
- Admin only: Delete page

---

## File Storage

### File Upload Schema
```typescript
interface FileUpload {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  file_url: string;
  storage_path: string;
  created_at: string;
}
```

### Storage Buckets

#### `project-files`
- User-uploaded project files
- Max size: 10MB per file
- Allowed types: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, GIF

#### `blog-images`
- Blog post cover images
- Max size: 5MB per file
- Allowed types: JPG, PNG, WebP

#### `profile-images`
- User profile pictures
- Max size: 2MB per file
- Allowed types: JPG, PNG

### Endpoints

#### POST `/api/storage/upload`
```json
{
  "bucket": "project-files" | "blog-images" | "profile-images",
  "file": "multipart/form-data"
}
```

#### GET `/api/storage/signed-url`
```json
{
  "bucket": "project-files",
  "file_path": "path/to/file.pdf",
  "expires_in": 3600
}
```

#### DELETE `/api/storage/files/:id`
- Deletes file

---

## Data Models & Schemas

### Database Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'free',
  subscription_plan VARCHAR(50),
  subscription_status VARCHAR(50),
  subscription_start TIMESTAMP,
  subscription_end TIMESTAMP,
  workspace_limit INTEGER DEFAULT 1,
  project_limit INTEGER DEFAULT 1,
  max_workspaces INTEGER,
  max_projects_per_workspace INTEGER,
  report_access BOOLEAN DEFAULT false,
  tool_access BOOLEAN DEFAULT false,
  user_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### workspaces
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### projects
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'planning',
  stage VARCHAR(50) DEFAULT 'planning',
  overall_score INTEGER,
  phase1_status VARCHAR(50) DEFAULT 'not_started',
  phase2_status VARCHAR(50) DEFAULT 'not_started',
  phase3_status VARCHAR(50) DEFAULT 'not_started',
  project_locked BOOLEAN DEFAULT true,
  project_unlocked_at TIMESTAMP,
  unlock_type VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### project_phases
```sql
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  phase_type INTEGER NOT NULL, -- 1, 2, or 3
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### icp_segments
```sql
CREATE TABLE icp_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  job_role VARCHAR(255),
  industry VARCHAR(255),
  company_size VARCHAR(255),
  geography VARCHAR(255),
  income_level VARCHAR(255),
  pain_profile JSONB,
  buying_behavior JSONB,
  channel_discovery JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### pain_profiles
```sql
CREATE TABLE pain_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES icp_segments(id) ON DELETE CASCADE,
  top_problems TEXT[],
  current_solution TEXT,
  pain_intensity_score INTEGER,
  purchase_probability INTEGER,
  revenue_potential VARCHAR(50),
  persona_summary TEXT,
  strategic_insights TEXT,
  best_channels TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  payment_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  payment_method_id VARCHAR(255),
  coupon_used VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium',
  sent_status VARCHAR(50) DEFAULT 'pending',
  action_url TEXT,
  link TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### admin_broadcasts
```sql
CREATE TABLE admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  target_group VARCHAR(100) NOT NULL,
  sent_count INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### support_tickets
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(50) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### ticket_replies
```sql
CREATE TABLE ticket_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_admin_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Rate Limiting

### Endpoints with Rate Limits

#### Authentication
- `/api/auth/login`: 5 attempts per 15 minutes
- `/api/auth/signup`: 3 attempts per hour per IP
- `/api/auth/forgot-password`: 3 attempts per hour per email

#### Project Operations
- `/api/projects`: 100 requests per hour per user
- `/api/studio/*`: 200 requests per hour per user

#### File Upload
- `/api/storage/upload`: 10 uploads per hour per user
- Max file size: 10MB

#### Analytics
- `/api/analytics/events`: 1000 events per hour per user

---

## Security Requirements

### Authentication
- JWT tokens with 24-hour expiration
- Refresh tokens with 7-day expiration
- Password requirements: min 8 characters, include uppercase, lowercase, number
- Rate limiting on authentication endpoints

### Authorization
- Role-based access control (RBAC)
- Admin role permissions as defined above
- Workspace-level permissions for projects

### Data Protection
- All sensitive data encrypted at rest
- HTTPS required for all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Compliance
- GDPR compliance for EU users
- CCPA compliance for California users
- Data retention policies
- Right to deletion endpoint

---

## Third-Party Integrations

### Payment Processors
- **Stripe**: Primary payment processor
- **PayPal**: Alternative payment method
- Webhooks for payment status updates

### Email Services
- **SendGrid**: Transactional emails
- **Postmark**: Backup email service
- Templates for verification, notifications, billing

### Analytics
- **PostHog**: Product analytics
- **Sentry**: Error tracking and monitoring
- Custom tracking endpoint for events

### File Storage
- **AWS S3**: Primary file storage
- **CloudFront CDN**: Asset delivery
- Image optimization and resizing

### Search
- **Algolia**: Full-text search for projects and content
- Real-time search suggestions
- Analytics on search behavior

---

## Webhook Events

### Payment Webhooks
```json
{
  "event": "payment.succeeded" | "payment.failed" | "subscription.created" | "subscription.cancelled",
  "data": {
    "payment_id": "payment_123",
    "user_id": "user_456",
    "amount": 16.99,
    "currency": "USD"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### User Lifecycle Webhooks
```json
{
  "event": "user.created" | "user.updated" | "user.deleted",
  "data": {
    "user_id": "user_456",
    "email": "user@example.com",
    "changes": {...}
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

---

## Environment Variables

### Required
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
SENDGRID_API_KEY=SG....
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=productnerve-files
POSTHOG_API_KEY=phc_...
SENTRY_DSN=https://...
```

### Optional
```
REDIS_URL=redis://...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...
```

---

## Deployment Considerations

### Scaling
- Horizontal scaling with load balancers
- Database read replicas for analytics queries
- CDN for static assets
- Caching with Redis for frequently accessed data

### Monitoring
- Application performance monitoring (APM)
- Error tracking and alerting
- Database performance monitoring
- API response time monitoring

### Backup Strategy
- Daily database backups
- Point-in-time recovery capability
- Cross-region backup replication
- File storage versioning

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {...}
  }
}
```

### Pagination Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

## Testing

### Required Test Coverage
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance tests for high-traffic endpoints

### Test Data
- Seed users with different plan types
- Test projects in various phases
- Sample payment scenarios
- Admin role testing data

---

This documentation provides a comprehensive foundation for building the Product Nerve AI backend. All endpoints, data models, and security considerations have been derived from the frontend implementation to ensure complete compatibility.
