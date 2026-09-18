import { useState, useEffect, useCallback } from 'react';

// Demo/mock tickets used when the backend is unreachable
const DEMO_TICKETS = [
  {
    id: 'demo-001',
    customer_mail: 'sarah.jones@company.com',
    raw_text: 'I was charged twice for my monthly subscription this billing cycle. My credit card shows two identical charges of $49.99 on Sept 15th. Please refund the duplicate charge immediately.',
    status: 'completed',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    drafted_response: 'Dear Sarah, thank you for reaching out regarding the duplicate charge. We have verified the billing discrepancy and initiated a refund of $49.99 to your credit card ending in ****4821. The refund should reflect within 3-5 business days. We apologize for the inconvenience.',
    classification: { category: 'billing', priority: 'high', sentiment: 'frustrated' }
  },
  {
    id: 'demo-002',
    customer_mail: 'mike.chen@enterprise.io',
    raw_text: 'The login page keeps showing a 500 Internal Server Error after I enter my credentials. I have tried clearing cookies, using incognito mode, and different browsers. This started happening about 2 hours ago and I cannot access my dashboard at all.',
    status: 'processing',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    drafted_response: '',
    classification: { category: 'technical_bug', priority: 'urgent', sentiment: 'angry' }
  },
  {
    id: 'demo-003',
    customer_mail: 'lisa.park@startup.co',
    raw_text: 'Hi, I would like to know more about the Enterprise tier features. Specifically, does it include SSO integration with Okta and custom SAML configurations? Also interested in the API rate limits for the enterprise plan.',
    status: 'completed',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    drafted_response: 'Hello Lisa! Great questions about our Enterprise tier. Yes, we fully support SSO integration with Okta and custom SAML 2.0 configurations. Enterprise API rate limits are set at 10,000 requests/minute with burst capacity up to 15,000. I would be happy to schedule a demo call to walk you through all Enterprise features.',
    classification: { category: 'general', priority: 'low', sentiment: 'neutral' }
  },
  {
    id: 'demo-004',
    customer_mail: 'alex.rivera@gmail.com',
    raw_text: 'I cannot access my account anymore. I tried resetting my password but the reset email never arrives. I have checked spam folders. My account email is alex.rivera@gmail.com and I have important project data stored there.',
    status: 'pending',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    drafted_response: '',
    classification: { category: 'account_issue', priority: 'medium', sentiment: 'frustrated' }
  },
  {
    id: 'demo-005',
    customer_mail: 'priya.sharma@techcorp.in',
    raw_text: 'Just wanted to say your new dashboard redesign is absolutely fantastic! The dark mode looks sleek and the real-time analytics widget is incredibly useful for our team. Keep up the great work!',
    status: 'completed',
    created_at: new Date(Date.now() - 5400000).toISOString(),
    drafted_response: 'Thank you so much for the wonderful feedback, Priya! We are thrilled to hear that you and your team are enjoying the new dashboard redesign. Your kind words motivate our design and engineering teams. We have more exciting features planned — stay tuned!',
    classification: { category: 'general', priority: 'low', sentiment: 'happy' }
  },
  {
    id: 'demo-006',
    customer_mail: 'tom.baker@finance.org',
    raw_text: 'I need to reset my password urgently. I am locked out of my admin panel and our quarterly report submission deadline is in 3 hours. The automated password reset link expired before I could use it.',
    status: 'processing',
    created_at: new Date(Date.now() - 900000).toISOString(),
    drafted_response: '',
    classification: { category: 'account_issue', priority: 'medium', sentiment: 'neutral' }
  }
];

/**
 * Custom React hook to manage tickets state.
 * Falls back to DEMO MODE with mock data when the backend API is unreachable.
 */
export const useTicketSocket = () => {
  const [tickets, setTickets] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Try to fetch from backend; fall back to demo mode
  useEffect(() => {
    const fetchInitialTickets = async () => {
      try {
        const res = await fetch('/api/tickets?limit=50');
        if (res.ok) {
          const data = await res.json();
          setTickets(data.tickets || []);
          if (data.tickets && data.tickets.length > 0) {
            setActiveTicketId(data.tickets[0].id);
          }
          setIsDemoMode(false);
        } else {
          throw new Error('Backend unavailable');
        }
      } catch (err) {
        console.log('ℹ️ Backend not available — entering Demo Mode with sample data');
        setIsDemoMode(true);
        setTickets(DEMO_TICKETS);
        setActiveTicketId(DEMO_TICKETS[0].id);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialTickets();
  }, []);

  // WebSocket connection (only when NOT in demo mode)
  useEffect(() => {
    if (isDemoMode) {
      // Simulate "connected" indicator in demo mode
      setIsConnected(true);
      return;
    }

    let socket;
    try {
      const { io } = require('socket.io-client');
      socket = io();

      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('ticket_new', (newTicket) => {
        setTickets((prev) => {
          if (prev.some(t => t.id === newTicket.id)) return prev;
          return [newTicket, ...prev];
        });
      });

      socket.on('ticket_resolved', (updatedTicket) => {
        setTickets((prev) =>
          prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
        );
      });
    } catch (e) {
      // socket.io not available in static build
      setIsConnected(true);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [isDemoMode]);

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  return {
    tickets,
    setTickets,
    isConnected,
    activeTicket,
    setActiveTicketId,
    loading,
    isDemoMode
  };
};
