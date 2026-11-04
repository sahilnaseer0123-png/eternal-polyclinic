# WhatsApp Business API setup (Meta WhatsApp Cloud API)

Automatic messages (appointment confirmations, lab report PDFs) need the clinic's own
**WhatsApp Business Platform** account. A normal WhatsApp or WhatsApp Business *app* number cannot send
automated messages or attach PDFs from the website. Until this is done, every message is logged as Failed
in the dashboard and can be retried afterwards.

## What the clinic needs

- A **Meta Business account** (business.facebook.com), ideally verified with the clinic's registration documents.
- A **phone number that is not already on WhatsApp** (or delete WhatsApp from it first). It becomes the
  clinic's sending number. Patients see the clinic name on messages.
- A **payment method** in Meta: India charges per message for business-initiated "utility" templates
  (small per-message fee; check Meta's current rate card before going live).

## Steps

1. **developers.facebook.com → My Apps → Create app → Business**, then add the **WhatsApp** product.
2. In **WhatsApp → API Setup**: add the clinic's phone number and verify it. Note the **Phone number ID**.
3. Create a **permanent access token**: Business Settings → System users → add a system user (Admin) →
   Assign the app and the WhatsApp account → Generate token with `whatsapp_business_messaging` and
   `whatsapp_business_management`. (The 24-hour test token on the API Setup page is NOT enough.)
4. Create two message templates in **WhatsApp Manager → Message templates** (category **Utility**, language **English**):

   **`appointment_confirmation`**, body:
   ```
   *ETERNAL POLYCLINIC*

   Hello {{1}},

   Your appointment at Eternal Polyclinic has been successfully booked.

   Doctor: {{2}}
   Appointment Date: {{3}}
   Appointment Time/Token: {{4}}

   Thank you for choosing Eternal Polyclinic.
   ```

   **`lab_report_ready`**, header type **Document**, body:
   ```
   *ETERNAL POLYCLINIC*

   Hello {{1}},

   Your lab report is ready!

   Your completed lab report is attached to this message as a PDF.

   You can also access and download your report securely through our website:

   {{2}}

   Thank you for choosing Eternal Polyclinic.
   ```
   Wait for both to show **Approved** (usually minutes to a day).

5. **Delivery tracking** (sent → delivered → read): in the app's **WhatsApp → Configuration → Webhook**:
   - Callback URL: `https://eternal-polyclinic.pages.dev/api/whatsapp/webhook`
   - Verify token: any long random text you choose (same as `WHATSAPP_VERIFY_TOKEN` below)
   - Subscribe to the **messages** field.
   - App secret: **App settings → Basic → App secret** (for `WHATSAPP_APP_SECRET`).

6. Add these as **encrypted secrets** in Cloudflare: Workers & Pages → `eternal-polyclinic` → Settings →
   Variables and Secrets → Production (type **Secret**), then redeploy:

   | Name | Value |
   | --- | --- |
   | `WHATSAPP_ACCESS_TOKEN` | permanent system-user token |
   | `WHATSAPP_PHONE_NUMBER_ID` | phone number ID from step 2 |
   | `WHATSAPP_TEMPLATE_APPOINTMENT` | `appointment_confirmation` |
   | `WHATSAPP_TEMPLATE_LAB_REPORT` | `lab_report_ready` |
   | `WHATSAPP_TEMPLATE_LANG` | `en` (or the exact language code the templates were approved in) |
   | `WHATSAPP_VERIFY_TOKEN` | your verify token from step 5 |
   | `WHATSAPP_APP_SECRET` | app secret from step 5 |

   Never put these in the code: the repository is public.

7. **Test**: dashboard → WhatsApp shows "Meta WhatsApp Cloud API", both templates "set", delivery tracking "on".
   Book a test walk-in to your own number, then create a test lab report for yourself and Mark Ready.
   Check the PDF arrives, the link opens, and the dashboard shows Delivered. Retry any messages that
   failed before setup from the WhatsApp section.

## Other providers

Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, plus `TWILIO_CONTENT_SID_APPOINTMENT`
/ `TWILIO_CONTENT_SID_LAB_REPORT` for approved templates; status callback `/api/whatsapp/twilio-status`) and generic
gateways (`WHATSAPP_WEBHOOK_URL`) are supported too. For PDFs they fetch the file from a signed link that
expires after 15 minutes. Meta's Cloud API is recommended: the PDF is uploaded directly, no link needed.
