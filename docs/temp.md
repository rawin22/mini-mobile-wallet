How GetVerified Works
It's a 4-step KYC wizard at src/pages/GetVerified.tsx.

Step Detection (on load)
The wizard checks existing FileAttachment records to determine where the user left off:


No front file → Step 1  (upload ID)
Has front, no selfie → Step 2  (upload selfie)
Has selfie, no vlink in description → Step 3  (review & submit)
Front file description contains get_verified_vlink_id → Step 4  (done)
Step 1 — Upload ID Documents
User picks country + ID type (fetched per-country from API)
Front file uploaded: POST /api/v1/FileAttachment with FileAttachmentTypeId: 1, BypassFileAnalysis: false → triggers OCR
Back file (conditional on RequireBackSide flag from the ID type)
OCR properties returned → pre-fill the review form
PATCH /api/v1/Customer (using bank user token) to save extracted data
PATCH /api/v1/FileAttachment to embed metadata into the description string
Step 2 — Upload Selfie
Camera capture or file upload
POST /api/v1/FileAttachment with FileAttachmentTypeId: 3, BypassFileAnalysis: true
Step 3 — Review & Submit (atomic 5-call sequence)
#	Call	Purpose
1	PATCH /api/v1/FileAttachment	Update front file description with corrected values
2	PATCH /api/v1/Customer	Save user-corrected profile (bank token)
3	POST /api/v1/VerifiedLink	Create the VLink → returns VerifiedLinkId + VerifiedLinkReference
4	PATCH /api/v1/VerifiedLink	Set VerifiedLinkUrl = {origin}/verify/{vlinkId}
5	PATCH /api/v1/FileAttachment	Append VLink ID/reference into front file description
Step 4 — Confirmation
Displays: QR code, VLink reference, copyable URL, document thumbnails.

How Documents Are Attached to VLinks
Documents are not directly linked to VLinks. The relationship is indirect through the customer:


FileAttachment (ParentObjectId = CustomerId)
      ↑
   Customer  ←──── VerifiedLink (CustomerId = same customer)
The Connection
Files are uploaded to the customer: FileAttachment.ParentObjectId = customerId, ParentObjectTypeId = 21
VLink is created pointing at the customer: VerifiedLink.CustomerId = customerId
Share flags on the VLink control what's exposed:

ShareIdFront: true    → exposes FileAttachmentTypeId 1
ShareIdBack: true     → exposes FileAttachmentTypeId 2
ShareSelfie: true     → exposes FileAttachmentTypeId 3
ShareFirstName/LastName/DateOfBirth/... → expose customer fields
When someone opens /verify/{vlinkId}, the API resolves: VLink → Customer → FileAttachments (filtered by share flags).

Metadata Traceability
The front file's Description field embeds the VLink for traceability (appended in Step 3, call #5):


documentType: Proof of Identity, country_of_issuance: HK, id_type: Passport,
account/id_number: A1234567, issuer_name: HKSAR, issuance_date: 2020-01-01,
expiry_date: 2030-01-01, is_get_verified_requested: True,
get_verified_requested_by_user_id: {userId},
get_verified_vlink_id: {vlinkId},
get_verified_vlink_reference: {vlinkReference}
This string is also how the wizard detects Step 4 on reload — it looks for get_verified_vlink_id: in the front file description.

Authentication Split
Operation	Token Used
Upload files	User's own bearer token
Create/update VLink	User's own bearer token
Update Customer	Bank service account token (from VITE_BANK_USERNAME/VITE_BANK_PASSWORD)
The bank token is needed because updating customer profile data requires elevated permissions that the regular user token doesn't have.