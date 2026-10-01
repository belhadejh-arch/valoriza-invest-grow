# Valoriza Investment Hub

تعليمات إلزامية — الجزء 1 من بناء التطبيق

أريد منك بناء تطبيق كامل فعلي اعتماداً على ملف PDF المرفق كمصدر أساسي للتصميم والمعلومات.

اسم التطبيق:
Valorizа

الشعار:
Invest Today .. Build Tomorrow

مهم جداً:
الملف المرفق يحتوي على شاشات مرجعية للتطبيق، ويجب دراستها بالكامل قبل البدء.

لا أريد Prototype أو Demo أو واجهة وهمية.

أريد تطبيق Full-Stack حقيقي وقابل للتشغيل.

==================================================

1. مصدر الحقيقة
   \==================================================

اعتبر ملف PDF المرفق المصدر الأساسي لـ:

- التصميم
- ترتيب العناصر
- الألوان
- الخطوط
- الأيقونات
- البطاقات
- الأزرار
- النصوص
- الأقسام
- التنقل
- المهام
- الباقات
- المستويات
- الإيداع
- السحب
- الاستثمار
- الفريق
- المكافآت
- الحساب
- خدمة العملاء
- الملاحظات البرمجية الموجودة في الملف.

يجب مراجعة جميع الصفحات والصور الموجودة في الملف.

لا تتجاهل المعلومات الموجودة داخل الصور حتى لو لم تكن نصاً قابلاً للنسخ.

================================================== 2. ممنوعات
==================================================

ممنوع:

- إنشاء Mock Data.
- إنشاء بيانات تجريبية بدلاً من قاعدة البيانات.
- إنشاء أزرار لا تعمل.
- إنشاء صفحات فارغة.
- حذف أي وظيفة موجودة في المرجع.
- استبدال التصميم بتصميم Dashboard عادي.
- اختصار الشاشات.
- استخدام بيانات ثابتة داخل Frontend للبيانات التي يجب أن تكون من قاعدة البيانات.
- إنشاء Login وهمي.
- إنشاء أرصدة وهمية.
- إنشاء عمليات سحب أو إيداع وهمية.
- اعتبار ضغط الزر وحده دليلاً على إكمال المهمة.

كل وظيفة يجب أن تكون حقيقية.

================================================== 3. اللغة
==================================================

اللغة الأساسية:
العربية.

اتجاه التطبيق:
RTL.

استخدم خط Changa أو خط عربي قريب جداً منه إذا كان Changa غير متوفر.

يجب أن تكون النصوص العربية واضحة ولا يحدث:

- قص للنص.
- تداخل.
- خروج النص من البطاقة.
- مشاكل RTL.
- مشاكل في الهواتف الصغيرة.

================================================== 4. التصميم العام
==================================================

التصميم يجب أن يكون مطابقاً قدر الإمكان للـPDF.

النمط:

- Dark Navy
- Royal Blue
- Electric Blue
- Cyan Glow
- Gold / Yellow
- White
- Green للحالات الإيجابية
- Red للحالات الخطرة
- Purple حيث يظهر في مستويات VIP.

استخدم:

- خلفيات داكنة.
- حدود مضيئة.
- Neon glow.
- بطاقات Rounded.
- Gradients.
- ظلال وإضاءة.
- أيقونات احترافية.
- صور مالية واستثمارية مشابهة للمرجع.

لا تستخدم ألواناً عشوائية.

================================================== 5. التصميم Mobile First
==================================================

التطبيق أساساً موجه للهاتف.

يجب أن يعمل بشكل صحيح على:

360px
390px
430px

ثم Tablet وDesktop.

ممنوع:

- Horizontal scrolling غير المقصود.
- تداخل العناصر.
- خروج الأزرار خارج الشاشة.
- قص البطاقات.
- مشاكل Bottom Navigation.
- مشاكل RTL.

================================================== 6. الهيكل الأساسي
==================================================

أنشئ Architecture نظيف وقابل للتوسع.

Frontend:
واجهة المستخدم والتنقل.

Backend:
Authentication
Users
Wallet
Transactions
Deposits
Withdrawals
Investments
VIP
Tasks
Rewards
Referrals
Notifications
Admin.

Database:
PostgreSQL.

استخدم API حقيقي بين Frontend وBackend.

لا تجعل Frontend مسؤولاً عن العمليات المالية الحساسة.

================================================== 7. قاعدة البيانات
==================================================

ابدأ بتصميم قاعدة البيانات الحقيقية.

الجداول الأساسية:

users
sessions
profiles
wallets
transactions
deposits
withdrawals
withdrawal_addresses
investment_funds
investments
vip_packages
user_vip
tasks
task_completions
daily_login_rewards
lucky_wheel_configs
lucky_wheel_spins
rewards
referrals
referral_commissions
notifications
customer_service_links
platform_settings
admin_users
admin_actions
audit_logs

استخدم Foreign Keys والعلاقات الصحيحة.

استخدم NUMERIC / DECIMAL للأموال وليس Float.

كل تغيير في الرصيد يجب أن يسجل في transactions.

لا تسمح للـFrontend بتعديل الرصيد مباشرة.

================================================== 8. الحسابات المالية
==================================================

كل عملية مالية يجب أن تكون Server Side.

أمثلة: Deposit
Withdrawal
Withdrawal Fee
Investment
Investment Return
VIP Purchase
Task Reward
Lucky Wheel Reward
Referral Commission
Daily Login Reward
Admin Adjustment

كل عملية يجب أن تسجل في Ledger/Transactions.

استخدم Database Transactions لمنع أخطاء الرصيد.

================================================== 9. إعداد المشروع
==================================================

قم الآن بـ:

1. فحص المشروع الحالي إن كان موجوداً.
2. فحص الملفات الموجودة.
3. فحص package.json.
4. فحص قاعدة البيانات.
5. فحص الـroutes.
6. فحص الـAPI.
7. فحص التصميم الحالي.
8. عدم حذف أي شيء يعمل.
9. إضافة البنية المطلوبة فقط.

إذا كان المشروع فارغاً، أنشئ البنية الكاملة.

إذا كان هناك كود موجود، حافظ على الوظائف الموجودة.

لا تبدأ بحذف المشروع وإعادة بنائه دون حاجة.

بعد ذلك أنشئ الأساس الحقيقي للمشروع وقاعدة البيانات.

لا تنتقل إلى تصميم جميع الصفحات قبل التأكد أن الـArchitecture والـDatabase يعملان.

نفذ هذا الجزء فعلياً داخل المشروع، ولا تكتفِ بشرح ما يجب فعله.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/39c3a370-ff9a-4f68-a27c-1cc8c055ffaf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
