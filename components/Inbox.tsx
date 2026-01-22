import React, { useState, useEffect, useRef } from 'react';
import { Mail, RefreshCw, AlertCircle, LogIn, Loader2, Key, ShieldCheck, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { InboxMessage } from '../types';

// Declare types for Google globals
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

const Inbox: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  
  // Auth State
  const [clientId, setClientId] = useState('');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Refs to maintain instance across renders without triggering re-renders
  const tokenClientRef = useRef<any>(null);
  const lastClientIdRef = useRef<string>('');

  useEffect(() => {
    const initializeGapi = async () => {
      // Wait until scripts are available
      if (typeof window !== 'undefined' && window.gapi && window.google) {
        // Load the client library specifically
        window.gapi.load('client', async () => {
          try {
            // Initialize the client with discovery docs
            await window.gapi.client.init({
              discoveryDocs: [DISCOVERY_DOC],
            });
            setScriptsLoaded(true);
          } catch (error) {
            console.error("Error initializing GAPI client", error);
            setAuthError("Failed to initialize Google API client.");
          }
        });
      } else {
        // Retry if scripts aren't loaded yet
        setTimeout(initializeGapi, 500);
      }
    };

    initializeGapi();
  }, []);

  const handleAuthClick = () => {
    setAuthError(null);
    const cleanClientId = clientId.trim();
    
    if (!cleanClientId) {
      alert("Please enter a valid Google Client ID to connect your real account.");
      return;
    }

    // Reuse existing client if Client ID hasn't changed
    if (tokenClientRef.current && lastClientIdRef.current === cleanClientId) {
      tokenClientRef.current.requestAccessToken({prompt: 'consent'});
      return;
    }

    try {
      // Initialize the Token Client (GIS)
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: cleanClientId,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error) {
            console.error("Auth Callback Error:", resp);
            setAuthError(`Authorization failed: ${resp.error}`);
            return;
          }
          
          // CRITICAL: Set the token for GAPI to use in requests
          if (resp.access_token) {
              if (window.gapi.client.setToken) {
                  window.gapi.client.setToken(resp);
              }
          }

          setIsConnected(true);
          fetchRealEmails();
        },
        error_callback: (nonRespError: any) => {
           console.warn("Auth Error Callback:", nonRespError);
           // Handle specific "popup_closed" or "popup_blocked"
           if (nonRespError.type === 'popup_closed') {
               setAuthError("Sign-in cancelled. If you saw an error in the popup (like 'Access Blocked'), please check your Client ID and Origin settings in Google Cloud Console.");
           } else {
               setAuthError("Popup blocked or closed unexpectedly. Please allow popups for this site.");
           }
        }
      });

      tokenClientRef.current = client;
      lastClientIdRef.current = cleanClientId;
      
      // Request Access
      client.requestAccessToken({prompt: 'consent'});

    } catch (e: any) {
      console.error("Auth Exception:", e);
      setAuthError(`Configuration Error: ${e.message}`);
    }
  };

  const fetchRealEmails = async () => {
    setIsLoading(true);
    setMessages([]);
    try {
      // Ensure the client is ready
      if (!window.gapi.client.gmail) {
         throw new Error("Gmail API not loaded yet.");
      }

      const response = await window.gapi.client.gmail.users.messages.list({
        'userId': 'me',
        'labelIds': ['INBOX'],
        'maxResults': 20
      });

      const messagesRaw = response.result.messages || [];
      const detailedMessages: InboxMessage[] = [];

      for (const msg of messagesRaw) {
        try {
          const detail = await window.gapi.client.gmail.users.messages.get({
            'userId': 'me',
            'id': msg.id
          });
          
          const payload = detail.result.payload;
          const headers = payload.headers;
          
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
          const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
          
          const fromNameMatch = from.match(/^"?([^"]+)"?\s*<(.+)>/);
          const fromName = fromNameMatch ? fromNameMatch[1] : from.split('@')[0];
          const fromEmail = fromNameMatch ? fromNameMatch[2] : from;

          detailedMessages.push({
            id: msg.id,
            fromName,
            fromEmail,
            subject,
            preview: detail.result.snippet,
            date: new Date(parseInt(detail.result.internalDate)).toLocaleDateString(),
            read: !detail.result.labelIds.includes('UNREAD')
          });
        } catch (e) {
          console.warn("Skipping message", msg.id, e);
        }
      }

      setMessages(detailedMessages);
    } catch (err) {
      console.error("Error fetching emails", err);
      if ((err as any)?.status === 401 || (err as any)?.status === 403) {
         setAuthError("Session expired or permission denied. Please reconnect.");
         setIsConnected(false);
      } else {
         // Don't alert, just show empty state or log
         console.warn("Fetch failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!scriptsLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-500 gap-3">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <p>Loading Google Services...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full text-center">
           <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
             <Key className="h-8 w-8" />
           </div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Real Gmail Account</h2>
           <p className="text-gray-500 mb-6 leading-relaxed text-sm">
             Enter your <strong>Google Client ID</strong> below to securely access your inbox via the official Gmail API.
           </p>

           {authError && (
             <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 flex items-start gap-2 text-left">
               <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
               <p>{authError}</p>
             </div>
           )}
           
           <div className="text-left bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Google Client ID</label>
              <input 
                type="text" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 123456789-abc...apps.googleusercontent.com"
                className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           
           <button
             onClick={handleAuthClick}
             disabled={!clientId}
             className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center justify-center gap-3 transition-colors shadow-md"
           >
             <ShieldCheck className="w-5 h-5" />
             Authorize & Connect
           </button>

           <div className="mt-6 border-t border-gray-100 pt-4">
             <button 
               onClick={() => setShowHelp(!showHelp)}
               className="flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-blue-600 mx-auto transition-colors"
             >
               <HelpCircle className="h-3 w-3" />
               {showHelp ? "Hide Troubleshooting" : "Where do I get a Client ID?"}
               {showHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
             </button>

             {showHelp && (
               <div className="text-left mt-3 bg-blue-50/50 p-3 rounded text-xs text-gray-600 space-y-2">
                 <p>1. Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-blue-600 underline">Google Cloud Console</a>.</p>
                 <p>2. Create a Project & Enable <strong>Gmail API</strong>.</p>
                 <p>3. Create <strong>OAuth 2.0 Client ID</strong>.</p>
                 <p className="font-bold text-red-600">4. Application Type MUST be "Web application".</p>
                 <p>5. Add your current URL (e.g., <code>{window.location.origin}</code>) to <strong>Authorized JavaScript origins</strong>.</p>
                 <p>6. Copy the Client ID here.</p>
               </div>
             )}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      {/* Message List */}
      <div className={`${selectedMessage ? 'hidden md:block' : 'block'} w-full md:w-1/3 border-r border-gray-200 flex flex-col`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Real Inbox
          </h3>
          <button onClick={fetchRealEmails} className={`p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-white ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1">
          {isLoading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Loader2 className="animate-spin text-blue-500 h-6 w-6" />
              <span className="text-xs text-gray-400">Fetching from Google...</span>
            </div>
          ) : messages.length === 0 ? (
             <div className="text-center p-8 text-gray-400 text-sm">No messages found in Inbox.</div>
          ) : (
            messages.map(msg => (
              <div 
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!msg.read ? 'bg-blue-50/50' : ''} ${selectedMessage?.id === msg.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between mb-1">
                   <span className={`text-sm truncate max-w-[70%] ${!msg.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{msg.fromName}</span>
                   <span className="text-xs text-gray-400 shrink-0">{msg.date}</span>
                </div>
                <div className={`text-sm mb-1 truncate ${!msg.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{msg.subject}</div>
                <div className="text-xs text-gray-500 truncate">{msg.preview}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail */}
      <div className={`${!selectedMessage ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-white`}>
        {selectedMessage ? (
          <>
             <div className="p-6 border-b border-gray-100 flex justify-between items-start">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2 leading-tight">{selectedMessage.subject}</h2>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shadow-sm">
                      {selectedMessage.fromName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{selectedMessage.fromName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        &lt;{selectedMessage.fromEmail}&gt;
                      </div>
                    </div>
                  </div>
               </div>
               <div className="text-sm text-gray-500">{selectedMessage.date}</div>
             </div>
             
             <div className="p-8 flex-1 overflow-y-auto text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
               {selectedMessage.preview}
               {/* 
                  Note: The Gmail API snippet is short. For full body, we would need 
                  to parse the complex 'payload' MIME parts (text/plain vs text/html).
                  For this demo, we display the snippet.
               */}
             </div>
             
             <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
               <button 
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium md:hidden"
               >
                 Back
               </button>
               <a 
                 href={`mailto:${selectedMessage.fromEmail}?subject=Re: ${selectedMessage.subject}`}
                 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm"
               >
                 Reply
               </a>
             </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/50">
            <Mail className="h-16 w-16 mb-4 opacity-20" />
            <p>Select a message to read</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;