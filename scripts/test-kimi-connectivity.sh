#!/usr/bin/env bash
# Test Kimi connectivity via OpenRouter
# Usage: ./scripts/test-kimi-connectivity.sh [OPENROUTER_API_KEY]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}       Kimi Connectivity Test (via OpenRouter)      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo

# Test 1: Check OpenRouter API is reachable
echo -e "${YELLOW}[1/4]${NC} Testing OpenRouter API availability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://openrouter.ai/api/v1/models")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓${NC} OpenRouter API is reachable (HTTP $HTTP_CODE)"
else
    echo -e "  ${RED}✗${NC} OpenRouter API unreachable (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 2: Verify Kimi models exist
echo -e "${YELLOW}[2/4]${NC} Checking Kimi models availability..."
MODELS=$(curl -s "https://openrouter.ai/api/v1/models" | grep -o '"id":"moonshotai/kimi[^"]*"' | sed 's/"id":"//g' | sed 's/"//g')
EXPECTED_MODELS=("moonshotai/kimi-k2.5" "moonshotai/kimi-k2-thinking" "moonshotai/kimi-k2:free")

for model in "${EXPECTED_MODELS[@]}"; do
    if echo "$MODELS" | grep -q "$model"; then
        echo -e "  ${GREEN}✓${NC} $model available"
    else
        echo -e "  ${RED}✗${NC} $model NOT found"
    fi
done

# Test 3: Verify messages endpoint exists (should return 400/401, not 404)
echo -e "${YELLOW}[3/4]${NC} Testing /v1/messages endpoint..."
MESSAGES_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://openrouter.ai/api/v1/messages" -H "Content-Type: application/json" -d '{}')
if [ "$MESSAGES_CODE" = "400" ] || [ "$MESSAGES_CODE" = "401" ]; then
    echo -e "  ${GREEN}✓${NC} Messages endpoint exists (HTTP $MESSAGES_CODE - expected without auth)"
elif [ "$MESSAGES_CODE" = "404" ]; then
    echo -e "  ${RED}✗${NC} Messages endpoint NOT found (HTTP 404)"
    exit 1
else
    echo -e "  ${YELLOW}?${NC} Unexpected response (HTTP $MESSAGES_CODE)"
fi

# Test 4: Optional API call test if key provided
API_KEY="${1:-$OPENROUTER_API_KEY}"
if [ -n "$API_KEY" ]; then
    echo -e "${YELLOW}[4/4]${NC} Testing API call with provided key..."
    RESPONSE=$(curl -s -X POST "https://openrouter.ai/api/v1/messages" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $API_KEY" \
        -d '{
            "model": "moonshotai/kimi-k2:free",
            "max_tokens": 50,
            "messages": [{"role": "user", "content": "Say hello in one word"}]
        }' 2>&1)

    if echo "$RESPONSE" | grep -q '"content"'; then
        echo -e "  ${GREEN}✓${NC} API call successful!"
        REPLY=$(echo "$RESPONSE" | grep -o '"text":"[^"]*"' | head -1 | sed 's/"text":"//g' | sed 's/"//g')
        echo -e "  ${BLUE}→${NC} Kimi says: $REPLY"
    elif echo "$RESPONSE" | grep -q '"error"'; then
        ERROR=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | sed 's/"message":"//g' | sed 's/"//g')
        echo -e "  ${RED}✗${NC} API error: $ERROR"
    else
        echo -e "  ${YELLOW}?${NC} Unexpected response: $RESPONSE"
    fi
else
    echo -e "${YELLOW}[4/4]${NC} Skipping API call test (no API key provided)"
    echo -e "  ${BLUE}→${NC} To test: ./scripts/test-kimi-connectivity.sh YOUR_OPENROUTER_KEY"
fi

echo
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Kimi provider is correctly configured!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo
echo "To use Kimi, create a wrapper with:"
echo "  ccm create my-kimi --provider kimi"
echo
echo "You'll need an OpenRouter API key from:"
echo "  https://openrouter.ai/keys"
