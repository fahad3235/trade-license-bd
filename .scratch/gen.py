# -*- coding: utf-8 -*-
"""trade-license-bd -- generate data.js + i18n.js with ASCII-escaped Bengali.

Category fees: City Corporation Model Tax Schedule 2016 (SRO 13-Ain/2016),
as listed for Dhaka City Corporation by bdnewsnet.com (accessed 2026-11-10).
Bill components: signboard tax 80/sq ft, VAT 15% of licence fee, income tax
at renewal under s.131 ITA 2023 (DNCC/DSCC/Chattogram 3000, other CC 2000,
paurashava 1000), late surcharge max(100, 10% of fee) per month after 30 Sep
— as reported by trw.co (updated Oct 2026). See DATA_NOTES.md.
Run: python3 .scratch/gen.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)

# (id, group_en, group_bn, name_en, name_bn, fee BDT)
CATEGORIES = [
    ("grocer", "Shops", "দোকান", "Grocer", "মুদি দোকান", 500),
    ("vegetable", "Shops", "দোকান", "Vegetable Retailer", "সবজি বিক্রেতা", 500),
    ("tea-betel", "Shops", "দোকান", "Tea-Betel Leaf Store", "চা-পান দোকান", 500),
    ("fruit", "Shops", "দোকান", "Fruit Shop", "ফলের দোকান", 500),
    ("newspaper", "Shops", "দোকান", "Newspaper Stall", "সংবাদপত্রের দোকান", 500),
    ("laundry-general", "Services", "সেবা", "Laundry (General)", "লন্ড্রি (সাধারণ)", 500),
    ("bookseller-small", "Shops", "দোকান", "Book Seller (Small)", "বই বিক্রেতা (ছোট)", 500),
    ("stationery-small", "Shops", "দোকান", "Stationery (Small)", "স্টেশনারি (ছোট)", 500),
    ("hair-salon-small", "Services", "সেবা", "Hair Dressing Salon (Small)", "সেলুন (ছোট)", 500),
    ("computer-training", "Institutions", "প্রতিষ্ঠান", "Computer Training Center", "কম্পিউটার প্রশিক্ষণ কেন্দ্র", 500),
    ("pharmacy-retail", "Shops", "দোকান", "Pharmacy (Retail)", "ফার্মেসি (খুচরা)", 1000),
    ("restaurant-nonac", "Food", "খাবার", "Restaurant (Non-A/C)", "রেস্তোরাঁ (নন-এ/সি)", 1000),
    ("tailor", "Services", "সেবা", "Tailor Shop", "দর্জি দোকান", 1000),
    ("coaching", "Institutions", "প্রতিষ্ঠান", "Coaching Center", "কোচিং সেন্টার", 1000),
    ("training", "Institutions", "প্রতিষ্ঠান", "Training Center", "প্রশিক্ষণ কেন্দ্র", 1000),
    ("hardware", "Shops", "দোকান", "Hardware Items", "হার্ডওয়্যার", 1200),
    ("restaurant-ac", "Food", "খাবার", "Restaurant (A/C)", "রেস্তোরাঁ (এ/সি)", 2500),
    ("pharmacy-wholesale", "Shops", "দোকান", "Pharmacy (Wholesale)", "ফার্মেসি (পাইকারি)", 2500),
    ("confectionery-big", "Food", "খাবার", "Confectionery (Big)", "কনফেকশনারি (বড়)", 2000),
    ("laundry", "Services", "সেবা", "Laundry", "লন্ড্রি", 2000),
    ("supplier", "Trade", "বাণিজ্য", "Supplier", "সরবরাহকারী", 2000),
    ("fastfood", "Food", "খাবার", "Fast Food Producer", "ফাস্ট ফুড", 3000),
    ("supershop", "Shops", "দোকান", "Super Shop / Mega Mall", "সুপার শপ", 3000),
    ("contractor-first", "Trade", "বাণিজ্য", "First Class Contractor", "প্রথম শ্রেণির ঠিকাদার", 4000),
    ("jewelry-showroom", "Shops", "দোকান", "Jewelry (with Showroom)", "জুয়েলারি (শোরুমসহ)", 4000),
    ("textile-mill", "Industry", "শিল্প", "Textile Mill", "বস্ত্র কারখানা", 4500),
    ("bank", "Finance", "অর্থ", "Scheduled Bank", "তফসিলি ব্যাংক", 10000),
    ("warehouse", "Trade", "বাণিজ্য", "Warehouse", "গুদাম", 10000),
    ("hotel-nonac", "Hotels", "হোটেল", "Residential Hotel (Non-Central A/C)", "আবাসিক হোটেল (নন-এ/সি)", 5000),
    ("insurance-branch", "Finance", "অর্থ", "Insurance (Branch Office)", "বীমা (শাখা)", 5000),
    ("university", "Institutions", "প্রতিষ্ঠান", "Private University", "বেসরকারি বিশ্ববিদ্যালয়", 5000),
    ("petrol", "Transport", "পরিবহন", "Petrol Pump", "পেট্রোল পাম্প", 5000),
    ("recruiting", "Services", "সেবা", "Recruiting Agent", "জনশক্তি রপ্তানি এজেন্ট", 5000),
    ("pharma-factory", "Industry", "শিল্প", "Pharmaceutical Factory", "ঔষধ কারখানা", 5000),
    ("builders", "Trade", "বাণিজ্য", "Builders / Developers", "নির্মাতা / ডেভেলপার", 6000),
    ("contractor-special", "Trade", "বাণিজ্য", "Special Class Contractor", "বিশেষ শ্রেণির ঠিকাদার", 6000),
    ("hotel-2star", "Hotels", "হোটেল", "Two Star Hotel (Central A/C)", "দুই তারকা হোটেল", 15000),
    ("hotel-4star", "Hotels", "হোটেল", "Four Star Hotel", "চার তারকা হোটেল", 25000),
    ("hospital-40plus", "Institutions", "প্রতিষ্ঠান", "Private Hospital (above 40 beds)", "বেসরকারি হাসপাতাল (৪০+ শয্যা)", 35000),
    ("hotel-5star", "Hotels", "হোটেল", "Five Star Hotel", "পাঁচ তারকা হোটেল", 50000),
]

# (id, name_en, name_bn, income tax at renewal BDT)
AUTHORITIES = [
    ("dncc", "Dhaka North City Corporation", "ঢাকা উত্তর সিটি কর্পোরেশন", 3000),
    ("dscc", "Dhaka South City Corporation", "ঢাকা দক্ষিণ সিটি কর্পোরেশন", 3000),
    ("ctg", "Chattogram City Corporation", "চট্টগ্রাম সিটি কর্পোরেশন", 3000),
    ("other-cc", "Other City Corporation", "অন্যান্য সিটি কর্পোরেশন", 2000),
    ("paurashava", "Paurashava", "পৌরসভা", 1000),
]

GUIDES = {
    "new": [
        ("Get your e-TIN", "আপনার ই-টিন নিন",
         "Register for an e-TIN from the National Board of Revenue (nbr.gov.bd) if you do not have one. It is required for a trade licence.",
         "জাতীয় রাজস্ব বোর্ড (nbr.gov.bd) থেকে ই-টিন নিন, যদি না থাকে। ট্রেড লাইসেন্সের জন্য এটি আবশ্যক।"),
        ("Collect your documents", "কাগজপত্র সংগ্রহ করুন",
         "NID copy, 2 passport photos, rent deed or ownership proof of the business premises, and the holding-tax receipt. See the checklist tab.",
         "জাতীয় পরিচয়পত্রের কপি, ২ কপি পাসপোর্ট ছবি, ব্যবসার স্থানের ভাড়ার চুক্তি বা মালিকানার প্রমাণ এবং হোল্ডিং ট্যাক্সের রসিদ। তালিকা ট্যাবে দেখুন।"),
        ("Apply at the ward / zonal office or online", "ওয়ার্ড / জোনাল অফিসে বা অনলাইনে আবেদন করুন",
         "Apply at your city corporation ward or zonal office, or through the e-trade portal etradelicense.gov.bd. Choose your business category carefully.",
         "আপনার সিটি কর্পোরেশনের ওয়ার্ড বা জোনাল অফিসে, অথবা etradelicense.gov.bd পোর্টালে আবেদন করুন। ব্যবসার ধরন সঠিকভাবে বেছে নিন।"),
        ("Pay the fee and keep the receipt", "ফি জমা দিয়ে রসিদ রাখুন",
         "Pay the licence fee + signboard tax + VAT at the counter or bank. Never pay without an official written receipt.",
         "কাউন্টার বা ব্যাংকে লাইসেন্স ফি + সাইনবোর্ড কর + ভ্যাট জমা দিন। অফিসিয়াল রসিদ ছাড়া কখনো টাকা দেবেন না।"),
        ("Inspection, if applicable", "প্রয়োজনে পরিদর্শন",
         "Some businesses (food, factories, clinics) may be inspected before the licence is issued. Keep the premises ready.",
         "কিছু ব্যবসা (খাবার, কারখানা, ক্লিনিক) লাইসেন্সের আগে পরিদর্শন হতে পারে। স্থান প্রস্তুত রাখুন।"),
        ("Collect your licence", "লাইসেন্স সংগ্রহ করুন",
         "Collect the printed trade licence from the office, usually within 3–7 working days of verification.",
         "যাচাইয়ের পর সাধারণত ৩–৭ কর্মদিবসের মধ্যে অফিস থেকে মুদ্রিত ট্রেড লাইসেন্স সংগ্রহ করুন।"),
        ("Display it at your premises", "স্থানে প্রদর্শন করুন",
         "Display the licence where customers can see it. It is valid for the financial year (1 July – 30 June).",
         "লাইসেন্সটি গ্রাহকদের দেখা যায় এমন জায়গায় প্রদর্শন করুন। এটি অর্থবছরের জন্য (১ জুলাই – ৩০ জুন) বৈধ।"),
    ],
    "renewal": [
        ("Check the deadline", "সময়সীমা দেখুন",
         "Renew by 30 September of the financial year. After that a monthly surcharge applies.",
         "অর্থবছরের ৩০ সেপ্টেম্বরের মধ্যে নবায়ন করুন। এরপর প্রতি মাসে জরিমানা প্রযোজ্য হয়।"),
        ("Bring the old licence and updated e-TIN", "পুরনো লাইসেন্স ও হালনাগাদ ই-টিন আনুন",
         "Take the previous year's licence, your updated e-TIN certificate and the holding-tax receipt.",
         "গত বছরের লাইসেন্স, হালনাগাদ ই-টিন সনদ ও হোল্ডিং ট্যাক্সের রসিদ নিয়ে যান।"),
        ("Pay fee + VAT + income tax (+ surcharge if late)", "ফি + ভ্যাট + আয়কর (+ বিলম্ব হলে জরিমানা) জমা দিন",
         "Renewal cost = licence fee + signboard tax + 15% VAT + income tax (s.131). Late renewal adds max(100, 10% of fee) per month.",
         "নবায়ন খরচ = লাইসেন্স ফি + সাইনবোর্ড কর + ১৫% ভ্যাট + আয়কর (ধারা ১৩১)। বিলম্বে নবায়নে প্রতি মাসে সর্বোচ্চ (১০০, ফির ১০%) জরিমানা।"),
        ("Get the licence stamped for the new year", "নতুন বছরের জন্য সিল করান",
         "The office stamps / re-issues the licence for the new financial year. Check the dates before you leave.",
         "অফিস নতুন অর্থবছরের জন্য লাইসেন্সে সিল দেয় / নতুন করে দেয়। যাওয়ার আগে তারিখ মিলিয়ে নিন।"),
        ("Display the renewed licence", "নবায়নকৃত লাইসেন্স প্রদর্শন করুন",
         "Replace the old licence on display with the renewed one.",
         "প্রদর্শনীতে পুরনো লাইসেন্সের বদলে নবায়নকৃতটি রাখুন।"),
    ],
}

CHECKLIST = [
    ("NID copy", "জাতীয় পরিচয়পত্রের কপি"),
    ("e-TIN certificate", "ই-টিন সনদ"),
    ("2 passport-size photos", "২ কপি পাসপোর্ট ছবি"),
    ("Rent deed / ownership proof of premises", "ভাড়ার চুক্তি / স্থানের মালিকানার প্রমাণ"),
    ("Holding-tax / municipal-tax receipt", "হোল্ডিং ট্যাক্স / পৌর করের রসিদ"),
    ("Partnership deed (if partnership)", "অংশীদারি চুক্তি (অংশীদারি হলে)"),
    ("Memorandum & articles (if limited company)", "মেমোরেন্ডাম ও আর্টিকেলস (লিমিটেড কোম্পানি হলে)"),
    ("Fire service clearance (if applicable)", "ফায়ার সার্ভিসের ছাড়পত্র (প্রযোজ্য হলে)"),
    ("Trade licence application form", "ট্রেড লাইসেন্স আবেদন ফরম"),
    ("Previous licence (renewal only)", "আগের লাইসেন্স (শুধু নবায়নে)"),
]

STR = {
    "en": {
        "title": "Trade License BD",
        "subtitle": "Trade licence fee estimator & renewal guide for Bangladesh — City Corporation Model Tax Schedule 2016",
        "tabCalc": "Fee Calculator",
        "tabTable": "Fee Table",
        "tabDeadline": "Renewal Deadline",
        "tabGuides": "Guides",
        "tabSaved": "Saved",
        "tabData": "Data",
        "catLabel": "Business category",
        "catHint": "Pick a category, or tap a row in the Fee Table.",
        "catPh": "— Choose a business —",
        "authLabel": "Issuing authority",
        "kindLabel": "Licence type",
        "kindNew": "New licence",
        "kindRenewal": "Renewal",
        "signLabel": "Signboard size (sq ft)",
        "signHint": "Signboard tax is ৳80 per sq ft. Enter 0 if there is no signboard.",
        "lateLabel": "Months late (renewal only)",
        "lateHint": "Surcharge: ৳100 or 10% of the licence fee per month, whichever is higher.",
        "calcBtn": "Calculate fee",
        "errCat": "Please choose a business category.",
        "errSign": "Signboard size must be 0–10,000 sq ft.",
        "errLate": "Months late must be 0–12.",
        "billTitle": "Your licence bill",
        "lineFee": "Licence fee",
        "lineSign": "Signboard tax (৳80 / sq ft)",
        "lineVat": "VAT (15% of licence fee)",
        "lineTax": "Income tax (renewal, s.131)",
        "lineSurcharge": "Late surcharge",
        "lineTotal": "Total payable",
        "saveNameLabel": "Save this estimate as",
        "saveNamePh": "e.g. Mirpur grocery shop",
        "saveBtn": "Save estimate",
        "needCalcFirst": "Calculate a fee first.",
        "nameRequired": "Please type a name for this estimate.",
        "estimateSaved": "Estimate saved.",
        "disclaimer": "Estimate only — not an official bill. Category fees are from the City Corporation Model Tax Schedule 2016 as reported; confirm the current rate at your city corporation / paurashava office or etradelicense.gov.bd.",
        "tableTitle": "Licence fees by business (Dhaka City Corporation)",
        "tableNote": "Tap a row to load that category into the calculator. Rates are the 2016 Model Tax Schedule as reported; your corporation may charge a different local rate — confirm before paying.",
        "tableSearchPh": "Search a business…",
        "thBusiness": "Business",
        "thFee": "Annual fee",
        "tableCount": "{n} categories",
        "deadlineTitle": "Renewal deadline checker",
        "deadlineNote": "A trade licence runs for the financial year (1 July – 30 June) and must be renewed by 30 September.",
        "dateLabel": "Check a date",
        "checkBtn": "Check deadline",
        "fyLabel": "Financial year",
        "deadlineLabel": "Renewal deadline",
        "daysLeft": "days left",
        "daysOverdue": "days overdue",
        "monthsLateEst": "Estimated months late",
        "statusOk": "On time",
        "statusSoon": "Due soon — renew within 30 days",
        "statusOverdue": "Overdue — surcharge applies",
        "applyLateBtn": "Use this in the calculator",
        "guidesTitle": "How to get & renew a trade licence",
        "guideNewTitle": "New licence — 7 steps",
        "guideRenTitle": "Renewal — 5 steps",
        "checklistTitle": "Document checklist",
        "checklistProgress": "{done} of {total} ready",
        "savedTitle": "Saved estimates",
        "savedEmpty": "No saved estimates yet. Calculate a fee and save it.",
        "savedTotal": "Total of saved estimates",
        "loadBtn": "Load",
        "deleteBtn": "Delete",
        "confirmDelete": "Delete this saved estimate?",
        "loadedMsg": "Loaded into the calculator.",
        "exportBtn": "Export JSON",
        "importBtn": "Import",
        "importPh": "Paste an exported JSON file here…",
        "importOk": "Import complete.",
        "importFail": "Import failed",
        "eraseTitle": "Erase all data",
        "eraseHint": "Type DELETE to erase all saved estimates, guide progress and checklist state.",
        "eraseBtn": "Erase everything",
        "eraseWrong": "Type DELETE exactly to erase.",
        "erasedMsg": "All data erased.",
        "footNote": "Sources: City Corporation Model Tax Schedule 2016 (SRO 13-Ain/2016); signboard ৳80/sq ft, 15% VAT, s.131 income tax and surcharge as reported by trw.co (2026); category fees as listed by bdnewsnet. Always verify at the issuing office.",
        "perSqft": "per sq ft",
        "sqft": "sq ft",
        "month": "month",
        "months": "months",
        "searchNoMatch": "No business matches that search.",
    },
    "bn": {
        "title": "ট্রেড লাইসেন্স বিডি",
        "subtitle": "বাংলাদেশের ট্রেড লাইসেন্স ফি হিসাব ও নবায়ন নির্দেশিকা — সিটি কর্পোরেশন মডেল ট্যাক্স তফসিল ২০১৬",
        "tabCalc": "ফি হিসাব",
        "tabTable": "ফি তালিকা",
        "tabDeadline": "নবায়ন সময়সীমা",
        "tabGuides": "নির্দেশিকা",
        "tabSaved": "সংরক্ষিত",
        "tabData": "তথ্য",
        "catLabel": "ব্যবসার ধরন",
        "catHint": "একটি ধরন বেছে নিন, অথবা ফি তালিকার সারিতে ট্যাপ করুন।",
        "catPh": "— ব্যবসা বেছে নিন —",
        "authLabel": "ইস্যুকারী কর্তৃপক্ষ",
        "kindLabel": "লাইসেন্সের ধরন",
        "kindNew": "নতুন লাইসেন্স",
        "kindRenewal": "নবায়ন",
        "signLabel": "সাইনবোর্ডের আকার (বর্গফুট)",
        "signHint": "সাইনবোর্ড কর ৳৮০ প্রতি বর্গফুট। সাইনবোর্ড না থাকলে ০ লিখুন।",
        "lateLabel": "বিলম্বের মাস (শুধু নবায়নে)",
        "lateHint": "জরিমানা: প্রতি মাসে ৳১০০ অথবা লাইসেন্স ফির ১০%, যেটি বেশি।",
        "calcBtn": "ফি হিসাব করুন",
        "errCat": "একটি ব্যবসার ধরন বেছে নিন।",
        "errSign": "সাইনবোর্ডের আকার ০–১০,০০০ বর্গফুট হতে হবে।",
        "errLate": "বিলম্বের মাস ০–১২ হতে হবে।",
        "billTitle": "আপনার লাইসেন্সের বিল",
        "lineFee": "লাইসেন্স ফি",
        "lineSign": "সাইনবোর্ড কর (৳৮০ / বর্গফুট)",
        "lineVat": "ভ্যাট (লাইসেন্স ফির ১৫%)",
        "lineTax": "আয়কর (নবায়ন, ধারা ১৩১)",
        "lineSurcharge": "বিলম্ব জরিমানা",
        "lineTotal": "মোট প্রদেয়",
        "saveNameLabel": "এই হিসাবটি সংরক্ষণ করুন",
        "saveNamePh": "যেমন: মিরপুর মুদি দোকান",
        "saveBtn": "হিসাব সংরক্ষণ করুন",
        "needCalcFirst": "প্রথমে ফি হিসাব করুন।",
        "nameRequired": "এই হিসাবের একটি নাম লিখুন।",
        "estimateSaved": "হিসাব সংরক্ষিত হয়েছে।",
        "disclaimer": "শুধু অনুমান — এটি অফিসিয়াল বিল নয়। ধরন অনুযায়ী ফি সিটি কর্পোরেশন মডেল ট্যাক্স তফসিল ২০১৬ অনুযায়ী; বর্তমান হার আপনার সিটি কর্পোরেশন / পৌরসভা অফিস অথবা etradelicense.gov.bd থেকে যাচাই করুন।",
        "tableTitle": "ব্যবসা অনুযায়ী লাইসেন্স ফি (ঢাকা সিটি কর্পোরেশন)",
        "tableNote": "হিসাবে ধরনটি লোড করতে সারিতে ট্যাপ করুন। হার ২০১৬ মডেল ট্যাক্স তফসিল অনুযায়ী; আপনার কর্পোরেশনের হার ভিন্ন হতে পারে — টাকা দেওয়ার আগে যাচাই করুন।",
        "tableSearchPh": "ব্যবসা খুঁজুন…",
        "thBusiness": "ব্যবসা",
        "thFee": "বার্ষিক ফি",
        "tableCount": "{n}টি ধরন",
        "deadlineTitle": "নবায়ন সময়সীমা যাচাই",
        "deadlineNote": "ট্রেড লাইসেন্স অর্থবছরের জন্য (১ জুলাই – ৩০ জুন) এবং ৩০ সেপ্টেম্বরের মধ্যে নবায়ন করতে হয়।",
        "dateLabel": "একটি তারিখ যাচাই করুন",
        "checkBtn": "সময়সীমা দেখুন",
        "fyLabel": "অর্থবছর",
        "deadlineLabel": "নবায়নের শেষ তারিখ",
        "daysLeft": "দিন বাকি",
        "daysOverdue": "দিন পার হয়ে গেছে",
        "monthsLateEst": "আনুমানিক বিলম্বের মাস",
        "statusOk": "সময়মতো",
        "statusSoon": "শীঘ্রই শেষ — ৩০ দিনের মধ্যে নবায়ন করুন",
        "statusOverdue": "মেয়াদোত্তীর্ণ — জরিমানা প্রযোজ্য",
        "applyLateBtn": "হিসাবে এটি ব্যবহার করুন",
        "guidesTitle": "ট্রেড লাইসেন্স পাওয়া ও নবায়নের উপায়",
        "guideNewTitle": "নতুন লাইসেন্স — ৭ ধাপ",
        "guideRenTitle": "নবায়ন — ৫ ধাপ",
        "checklistTitle": "কাগজপত্রের তালিকা",
        "checklistProgress": "{total}টির মধ্যে {done}টি প্রস্তুত",
        "savedTitle": "সংরক্ষিত হিসাব",
        "savedEmpty": "এখনো কোনো হিসাব সংরক্ষিত হয়নি। ফি হিসাব করে সংরক্ষণ করুন।",
        "savedTotal": "সংরক্ষিত হিসাবের মোট",
        "loadBtn": "লোড",
        "deleteBtn": "মুছুন",
        "confirmDelete": "এই সংরক্ষিত হিসাবটি মুছবেন?",
        "loadedMsg": "হিসাবে লোড হয়েছে।",
        "exportBtn": "JSON এক্সপোর্ট",
        "importBtn": "ইমপোর্ট",
        "importPh": "এক্সপোর্ট করা JSON এখানে পেস্ট করুন…",
        "importOk": "ইমপোর্ট সম্পন্ন হয়েছে।",
        "importFail": "ইমপোর্ট ব্যর্থ হয়েছে",
        "eraseTitle": "সব তথ্য মুছুন",
        "eraseHint": "সব সংরক্ষিত হিসাব, নির্দেশিকার অগ্রগতি ও তালিকা মুছতে DELETE লিখুন।",
        "eraseBtn": "সব মুছুন",
        "eraseWrong": "মুছতে ঠিক DELETE লিখুন।",
        "erasedMsg": "সব তথ্য মোছা হয়েছে।",
        "footNote": "সূত্র: সিটি কর্পোরেশন মডেল ট্যাক্স তফসিল ২০১৬ (এসআরও ১৩-আইন/২০১৬); সাইনবোর্ড ৳৮০/বর্গফুট, ১৫% ভ্যাট, ধারা ১৩১ আয়কর ও জরিমানা trw.co (২০২৬) অনুযায়ী; ধরন অনুযায়ী ফি bdnewsnet অনুযায়ী। ইস্যুকারী অফিসে সবসময় যাচাই করুন।",
        "perSqft": "প্রতি বর্গফুট",
        "sqft": "বর্গফুট",
        "month": "মাস",
        "months": "মাস",
        "searchNoMatch": "এই খোঁজে কোনো ব্যবসা পাওয়া যায়নি।",
    },
}


def js_escape(obj):
    return json.dumps(obj, ensure_ascii=True, indent=2)


def main():
    categories = [
        {"id": c[0], "group_en": c[1], "group_bn": c[2],
         "name_en": c[3], "name_bn": c[4], "fee": c[5]} for c in CATEGORIES
    ]
    authorities = [
        {"id": a[0], "name_en": a[1], "name_bn": a[2], "incomeTax": a[3]}
        for a in AUTHORITIES
    ]
    guides = {
        "new": [{"title_en": s[0], "title_bn": s[1], "body_en": s[2], "body_bn": s[3]}
                for s in GUIDES["new"]],
        "renewal": [{"title_en": s[0], "title_bn": s[1], "body_en": s[2], "body_bn": s[3]}
                    for s in GUIDES["renewal"]],
    }
    checklist = [{"name_en": c[0], "name_bn": c[1]} for c in CHECKLIST]
    data = {
        "CATEGORIES": categories,
        "AUTHORITIES": authorities,
        "GUIDES": guides,
        "CHECKLIST": checklist,
        "SIGNBOARD_RATE": 80,
        "VAT_RATE": 0.15,
        "SURCHARGE_MIN": 100,
        "SURCHARGE_PCT": 0.10,
        "RENEWAL_MONTH": 9,
        "RENEWAL_DAY": 30,
    }
    data_js = ("// trade-license-bd -- data (generated by .scratch/gen.py).\n"
               "// Category fees: City Corporation Model Tax Schedule 2016 as listed\n"
               "// for Dhaka City Corporation by bdnewsnet (accessed 2026-11-10).\n"
               "// Bengali is ASCII-escaped (\\uXXXX) so the push API keeps it intact.\n"
               "(function (root) {\n  'use strict';\n"
               "  var DATA = " + js_escape(data) + ";\n"
               "  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;\n"
               "  else root.TradeLicenseData = DATA;\n"
               "})(typeof window !== 'undefined' ? window : globalThis);\n")
    with open(os.path.join(OUT, "data.js"), "w", encoding="ascii") as f:
        f.write(data_js)

    i18n_js = ("// trade-license-bd -- UI strings (generated by .scratch/gen.py).\n"
               "(function (root) {\n  'use strict';\n"
               "  var STR = " + js_escape(STR) + ";\n"
               "  if (typeof module !== 'undefined' && module.exports) module.exports = { STR: STR };\n"
               "  else root.TradeLicenseI18n = { STR: STR };\n"
               "})(typeof window !== 'undefined' ? window : globalThis);\n")
    with open(os.path.join(OUT, "i18n.js"), "w", encoding="ascii") as f:
        f.write(i18n_js)

    print("wrote data.js (%d categories, %d authorities, %d+%d guide steps, %d checklist items)"
          % (len(categories), len(authorities), len(guides["new"]), len(guides["renewal"]), len(checklist)))


if __name__ == "__main__":
    main()
