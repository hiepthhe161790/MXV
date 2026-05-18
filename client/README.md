# MVX Trading Client

React + TypeScript web application for the MVX derivatives trading platform.

## Features

✅ **Real-time Trading Dashboard**
- Live price charts and market data
- Position monitoring
- P&L tracking

✅ **Order Management**
- Place market, limit, stop, and stop-limit orders
- Cancel pending orders
- Order history

✅ **Position Management**
- Open/close positions
- Risk management
- Leverage control

✅ **Account Management**
- Deposits and withdrawals
- Transaction history
- Balance tracking

✅ **Real-time Updates**
- WebSocket for live data
- Auto-refresh intervals
- Real-time notifications

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Socket.io** - Real-time updates
- **Recharts** - Data visualization
- **Vite** - Build tool

## Getting Started

### Prerequisites
- Node.js 16+
- Backend API running on http://localhost:3000

### Installation

```bash
cd client
npm install
```

### Environment Setup

Create `.env.local` file:

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
```

### Development

```bash
npm run start
```

Open [http://localhost:5173](http://localhost:5173)

### Build

```bash
npm run build
```

## Project Structure

```
client/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   ├── services/         # API & WebSocket services
│   ├── context/          # Zustand stores
│   ├── hooks/            # Custom React hooks
│   ├── styles/           # Global styles
│   ├── utils/            # Utility functions
│   ├── App.tsx           # Root component
│   └── main.tsx          # Entry point
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript config
├── tailwind.config.js    # Tailwind config
└── package.json
```

## API Integration

### Authentication
- Login with email/password
- Token stored in localStorage
- Auto-redirect on 401

### Trading Operations
- Create orders
- Close positions
- Deposit/withdraw funds
- View transactions

### Real-time Data
- Price updates via WebSocket
- Order status changes
- Position updates
- New trades

## Components

### StatsDashboard
Shows key metrics:
- Total balance
- Available balance
- Unrealized P&L
- Open positions

### OrderForm
Create new orders:
- Market, Limit, Stop, Stop-Limit
- Symbol selection
- Risk management

### QuickActions
Fast deposit/withdraw functionality

## Features Coming Soon

- [ ] Advanced charting (TradingView)
- [ ] Technical indicators
- [ ] Automated trading
- [ ] Portfolio analytics
- [ ] Mobile app
- [ ] Multi-language support

## Troubleshooting

### Connection Issues
1. Check backend is running: `npm run dev` in `../`
2. Verify API URL in `.env`
3. Check browser console for CORS errors

### WebSocket Not Connecting
1. Ensure socket.io is configured on backend
2. Check WebSocket URL in `.env`
3. Verify token is valid

## Performance Tips

- Lazy load routes
- Memoize expensive components
- Use React DevTools Profiler
- Monitor API requests in Network tab

## Security

- ✅ Token-based authentication
- ✅ HTTPS ready
- ✅ XSS protection
- ✅ CSRF token support

## License

MIT

## Support

For issues and questions:
1. Check documentation
2. Review API responses
3. Check browser console
4. Contact support
