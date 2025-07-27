# User Authentication System Architecture

## Overview
Implement user authentication using Supabase Auth (already configured) to provide secure login, session management, and user identity verification for the poker platform.

## Architecture Components

### 1. Supabase Auth Integration
**Already Configured** ✅
- JWT tokens with 1-hour expiry
- Refresh token rotation enabled  
- Email/password signup enabled
- Local development at http://127.0.0.1:3000

### 2. Frontend Authentication Layer
```typescript
// packages/shared/src/auth-types.ts
interface AuthUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  last_sign_in_at: string;
}

interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
```

### 3. Authentication API Layer
```typescript
// packages/app/src/lib/auth-client.ts
class AuthClient {
  private supabase: SupabaseClient;
  
  async signUp(email: string, password: string, username: string): Promise<AuthResult>
  async signIn(email: string, password: string): Promise<AuthResult>
  async signOut(): Promise<void>
  async getSession(): Promise<AuthSession | null>
  async refreshSession(): Promise<AuthSession>
  async getCurrentUser(): Promise<AuthUser | null>
}
```

### 4. Backend Authentication Middleware
```typescript
// packages/app/src/lib/auth-middleware.ts
interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
  userId: string;
}

export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<Response>
): Promise<(req: NextRequest) => Promise<Response>>

export async function requireAuth(req: NextRequest): Promise<AuthUser>
```

### 5. Protected Route System
```typescript
// packages/app/src/components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({ children, fallback, redirectTo }: ProtectedRouteProps)
```

## Database Schema Extensions

### User Profile Table
```sql
-- Extends Supabase auth.users with game-specific data
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Game Statistics
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_chips_won BIGINT DEFAULT 0,
  
  -- User Preferences
  auto_rebuy BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  animation_enabled BOOLEAN DEFAULT true
);

-- RLS Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);
```

### User Sessions Table (Optional - for enhanced tracking)
```sql
CREATE TABLE public.user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

## Integration Points

### 1. Lobby System Integration
```typescript
// Modified lobby APIs require authentication
POST /api/lobby/games (requires auth)
  Headers: { Authorization: "Bearer <token>" }
  Body: { name: string, maxPlayers: number, gameType: string }
  
POST /api/lobby/games/:gameId/join (requires auth)
  Headers: { Authorization: "Bearer <token>" }
  // playerName now comes from authenticated user
```

### 2. Game System Integration  
```typescript
// All game actions require authentication
POST /api/game/:gameId/action (requires auth)
  Headers: { Authorization: "Bearer <token>" }
  Body: { action: string, amount?: number }
  // playerId verified against authenticated user

GET /api/game/:gameId (requires auth if player in game)
  Headers: { Authorization: "Bearer <token>" }
  // Only returns full state if user is a player
```

### 3. Real-time Integration
```typescript
// SSE connections require authentication
GET /api/game/:gameId/events?token=<jwt_token>
// Validates token and user permission for game events
```

## Security Implementation

### 1. Token Validation
```typescript
// packages/app/src/lib/auth-utils.ts
export async function validateJWT(token: string): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    
    // Get extended user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      id: user.id,
      email: user.email!,
      username: profile?.username || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || ''
    };
  } catch {
    return null;
  }
}
```

### 2. Game Action Authorization
```typescript
export async function verifyGameAction(
  gameId: string, 
  userId: string, 
  action: string
): Promise<boolean> {
  // 1. Verify user is a player in the game
  const game = gameStore.get(gameId);
  if (!game) return false;
  
  const userPlayer = game.players.find(p => p.userId === userId);
  if (!userPlayer) return false;
  
  // 2. Verify it's the user's turn (for actions that require turns)
  if (['fold', 'call', 'raise', 'check'].includes(action)) {
    return game.currentPlayer === userPlayer.id;
  }
  
  return true;
}
```

## User Experience Flow

### 1. First-Time User
1. **Landing page** → "Sign Up" button
2. **Registration form** → email, password, username
3. **Email verification** (optional, disabled for dev)
4. **Auto-login** → redirect to lobby
5. **Profile setup** → display name, preferences

### 2. Returning User
1. **Landing page** → "Sign In" button  
2. **Login form** → email/password
3. **Remember me** → extended session
4. **Redirect to lobby** → see available games

### 3. Protected Actions
1. **Join game** → requires authentication
2. **Make poker action** → verifies user identity
3. **Create game** → authenticated user becomes owner
4. **Session expires** → prompt to re-authenticate

## Implementation Phases

### Phase 1: Core Authentication (Week 1)
- [ ] Supabase client setup
- [ ] Auth context and hooks
- [ ] Login/register UI components
- [ ] Protected route wrapper
- [ ] Basic user profile system

### Phase 2: Game Integration (Week 1)  
- [ ] Authenticate lobby APIs
- [ ] Authenticate game APIs
- [ ] User identity in game state
- [ ] Action authorization middleware
- [ ] SSE authentication

### Phase 3: Enhanced Features (Week 2)
- [ ] User profile page
- [ ] Game statistics tracking
- [ ] Session management
- [ ] Remember me functionality
- [ ] Logout from all devices

### Phase 4: Polish & Testing (Week 2)
- [ ] Comprehensive test coverage
- [ ] Error handling and UX
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation

## Benefits of This Architecture

### 1. **Security First**
- Industry-standard JWT authentication
- Secure password handling by Supabase
- Built-in protection against common attacks

### 2. **Scalability**
- Supabase handles auth infrastructure
- Stateless JWT tokens enable horizontal scaling
- Row-level security for data protection

### 3. **Developer Experience**
- Well-documented Supabase Auth APIs
- TypeScript-first implementation
- Familiar React patterns with hooks/context

### 4. **User Experience**  
- Seamless login/logout flows
- Automatic session management
- Remember me functionality
- Mobile-responsive auth UI

This architecture provides a robust foundation for user authentication while leveraging Supabase's proven auth infrastructure.