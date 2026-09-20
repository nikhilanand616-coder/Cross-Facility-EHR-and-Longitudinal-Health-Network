#!/usr/bin/env bash
# ==============================================================================
# Pan-India Cross-Facility EHR: Firebase Cloud Functions Deployment Script
# 
# Deploys:
#   1. onHighRiskPatientWritten (Firestore Trigger on /patients/{patientId})
#   2. escalateMissedAppointmentsDailyCron (Pub/Sub Cron Job at 8:00 AM IST)
# ==============================================================================

set -e

# Terminal colors
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "================================================================================"
echo "   Pan-India Cross-Facility EHR: Firebase Cloud Functions Deployment            "
echo "================================================================================"
echo -e "${NC}"

# 1. Check Node.js runtime
echo -e "${CYAN}▶ Checking Node.js version...${NC}"
NODE_VERSION=$(node -v 2>/dev/null || echo "not_found")
if [ "$NODE_VERSION" = "not_found" ]; then
  echo -e "${RED}✘ Error: Node.js is not installed. Please install Node.js 20 or higher.${NC}"
  exit 1
fi
echo -e "${GREEN}✔ Detected Node.js: ${NODE_VERSION}${NC}"

# 2. Check Firebase CLI
echo -e "\n${CYAN}▶ Checking Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
  echo -e "${YELLOW}✘ Firebase CLI is not installed globally.${NC}"
  echo -e "  Install via: ${BOLD}npm install -g firebase-tools${NC}"
  echo -e "  Or login via: ${BOLD}npx firebase login${NC}"
  FIREBASE_CMD="npx firebase"
else
  FIREBASE_CMD="firebase"
fi
echo -e "${GREEN}✔ Using Firebase command: ${FIREBASE_CMD}${NC}"

# 3. Resolve Target Firebase Project ID
PROJECT_ID="preproute-ai"
CONFIG_FILE="../firebase-applet-config.json"

if [ -f "$CONFIG_FILE" ]; then
  PARSED_PROJECT=$(grep -o '"projectId": *"[^"]*"' "$CONFIG_FILE" | head -1 | cut -d'"' -f4 || echo "")
  if [ -n "$PARSED_PROJECT" ]; then
    PROJECT_ID="$PARSED_PROJECT"
  fi
fi

echo -e "\n${CYAN}▶ Setting active Firebase project: ${BOLD}${PROJECT_ID}${NC}"
$FIREBASE_CMD use "$PROJECT_ID" || true

# 4. Install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo -e "\n${CYAN}▶ Installing dependencies from package.json...${NC}"
  npm install
else
  echo -e "\n${GREEN}✔ Dependencies already present in node_modules.${NC}"
fi

# 5. Build TypeScript code
echo -e "\n${CYAN}▶ Compiling TypeScript Cloud Functions...${NC}"
npm run build

echo -e "${GREEN}✔ Build succeeded. Output generated in lib/ directory.${NC}"

# 6. Inform user of optional SMS Gateway API environment secrets
echo -e "\n${YELLOW}${BOLD}ℹ SMS Gateway Configuration Notice:${NC}"
echo -e "  To use live SMS dispatch (Twilio or Fast2SMS) in production, configure environment secrets:"
echo -e "    ${BOLD}firebase functions:secrets:set TWILIO_ACCOUNT_SID${NC}"
echo -e "    ${BOLD}firebase functions:secrets:set TWILIO_AUTH_TOKEN${NC}"
echo -e "    ${BOLD}firebase functions:secrets:set TWILIO_PHONE_NUMBER${NC}"
echo -e "    ${BOLD}firebase functions:secrets:set FAST2SMS_API_KEY${NC}"
echo -e "  (If unconfigured, the functions automatically run in verified Mockup Alert mode)."

# 7. Execute Deployment
echo -e "\n${CYAN}${BOLD}▶ Deploying Functions to Firebase Cloud Infrastructure (${PROJECT_ID})...${NC}"
$FIREBASE_CMD deploy \
  --project "$PROJECT_ID" \
  --only "functions:onHighRiskPatientWritten,functions:escalateMissedAppointmentsDailyCron,functions:testSimulateHighRiskPatient,functions:testSimulateDailyCronEscalation"

echo -e "\n${GREEN}${BOLD}================================================================================"
echo "✔ Cloud Functions successfully deployed to project: ${PROJECT_ID}"
echo "================================================================================${NC}"
echo -e "  • ${BOLD}onHighRiskPatientWritten${NC}: Listens to /patients/{patientId} in asia-south1"
echo -e "  • ${BOLD}escalateMissedAppointmentsDailyCron${NC}: Pub/Sub Schedule '0 8 * * *' (Asia/Kolkata)"
echo -e "\nTo view live execution logs in your terminal:"
echo -e "  ${BOLD}$FIREBASE_CMD functions:log --project ${PROJECT_ID}${NC}"
echo -e "\nTo run locally with the Firebase Emulator Suite:"
echo -e "  ${BOLD}npm run serve${NC}"
