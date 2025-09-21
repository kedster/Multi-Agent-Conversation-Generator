# Unit Tests for Conversation Moderation Logic

This directory contains comprehensive unit tests for the Multi-Agent Conversation Generator's conversation moderation system.

## Test Structure

### `conversationUtils.test.ts` - Conversation Utilities (18 tests)
Tests the core utility functions for conversation processing:

- **`detectMentionedAgents`** - Tests agent mention detection including:
  - Direct name mentions ("Alex", "Alex Morgan") 
  - Role-based mentions ("frontend engineer", "product manager")
  - Call-out phrases ("Hey Alex", "@Carlos", "Carlos,")
  - Case insensitive matching and partial word filtering
  - Edge cases (empty messages, short names, no mentions)

- **`shouldAgentSpeak`** - Tests relevance threshold validation:
  - Threshold comparisons (above/below minimum relevance)
  - Default threshold behavior
  - Edge cases with negative values and large numbers

### `turnDistribution.test.ts` - Speaker Selection Algorithm (12 tests)
Tests the `selectTopSpeakers` function that determines which agents speak next:

- **Priority System Testing:**
  - Mentioned agents get highest priority
  - Forced speakers (skipped >= 2 turns) get second priority  
  - High relevance agents (>= 5) get third priority
  - Recent speaker avoidance when relevance is similar

- **Dual Speaker Selection:**
  - Second speaker selection based on relevance >= 6
  - Mentioned or forced agents as second speakers
  - Primary score calculation (80% relevance, 20% context)

- **Edge Cases:**
  - Empty scores array handling
  - No eligible speakers fallback
  - Multiple mentioned agents prioritization

### `scoringSystem.test.ts` - Agent Scoring Integration (13 tests)
Tests the scoring system components and integration logic:

- **Score Calculation:**
  - Total score computation (cumulative + current)
  - Score initialization and updates
  - Missing agent score handling

- **Skipped Turns Management:**
  - Initialization and updates after speaker selection
  - Single and multiple speaker scenarios
  - Force-to-speak threshold (>= 2 skipped turns)

- **Conversation Analysis:**
  - Conversation history formatting
  - Context message filtering
  - Agent profile formatting

- **Monitor Decision Validation:**
  - Valid decision structure validation
  - Error handling for malformed responses

## Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run  

# Run tests with UI
npm run test:ui
```

## Test Coverage

The tests provide comprehensive coverage of:
- ✅ Agent mention detection and parsing
- ✅ Relevance-based speaker selection
- ✅ Turn distribution fairness algorithms  
- ✅ Cumulative scoring and tracking
- ✅ Edge cases and error scenarios
- ✅ Integration between components

## Key Testing Principles

1. **Isolation** - Each function is tested independently with mock data
2. **Edge Cases** - Tests handle empty inputs, malformed data, and boundary conditions  
3. **Integration** - Tests verify components work together correctly
4. **Regression Prevention** - Tests catch changes that break existing behavior
5. **Behavior Validation** - Tests verify the algorithm behaves as designed

## Test Data

Tests use consistent mock agent data representing a typical software development team:
- Alex Morgan (Frontend Engineer)
- Brenda Chen (Backend Engineer) 
- Carlos Rodriguez (Product Manager)
- Diana Kim (DevOps Engineer)

This ensures realistic testing scenarios while maintaining predictable test outcomes.