---
inclusion: always
---

# Product: Ronda

Ronda Kit is a lean template for branching incident-response drills ("gladi" = drill/rehearsal in Indonesian). One engine, many drills: each app is just scenario content plus a themed UI.

## Audience
- App A, Ransomware Haunted House: owners and staff of small businesses (UMKM) and small IT teams in Indonesia, with no dedicated security staff.
- App B (later), safety drill: factory workers practicing fire or chemical-spill response.

## Problem
Ransomware against Indonesian small businesses is rising, and most have never rehearsed what to do in the first hour. Policies and PDFs are not read; a 5-minute drill is.

## Principles
- Defensive only. Never include attack instructions, exploit steps, or malware details.
- All scenarios are fictional. No real company data, network layouts, or internal procedures.
- Every bad choice teaches one concrete control (offline backup, MFA, network isolation, evidence preservation, etc.).
- Bilingual: every user-facing string exists in Indonesian (`id`) and English (`en`). Write natural Indonesian, not literal translation.
- Spooky theme supports the learning: the "ghost" is the consequence of a bad decision, never a jump scare.
- A session should take 3–5 minutes.
- Legal or regulatory claims (e.g. Indonesian personal data protection law) must be verified against the official text or phrased as general advice.
