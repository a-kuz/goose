# Frontend Tests

This directory contains comprehensive tests for the frontend application.

## Test Structure

- `setup.ts` - Test environment configuration
- `utils.tsx` - Custom render utilities with providers
- `mocks.ts` - Mock data and API client mocks
- `api.test.ts` - API client tests
- `AuthContext.test.tsx` - Authentication context tests
- `Login.test.tsx` - Login component tests
- `RoundsList.test.tsx` - Rounds list component tests
- `RoundGame.test.tsx` - Round game component tests
- `useWebSocket.test.ts` - WebSocket hook tests
- `App.test.tsx` - App component tests
- `integration.test.tsx` - End-to-end integration tests

## Running Tests

```bash
npm test
```

Run tests in watch mode:
```bash
npm test -- --watch
```

Run tests with UI:
```bash
npm run test:ui
```

Generate coverage report:
```bash
npm run test:coverage
```

## Test Coverage

The test suite covers:

- Authentication flow (login, logout, token management)
- API client functionality
- Component rendering and user interactions
- WebSocket connection and reconnection
- Round management (create, view, tap)
- Protected routes
- Error handling
- Integration flows

## Technologies

- Vitest - Test runner
- React Testing Library - Component testing
- jsdom - DOM environment
- @testing-library/user-event - User interaction simulation

