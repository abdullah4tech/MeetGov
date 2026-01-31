"use client";

import { useState, useRef, useEffect } from "react";
import { useDashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare,
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { useMitly } from "@/hooks/use-mitly";

export default function AssistantPage() {
  const { user } = useDashboard();
  const { status, messages, isProcessing, sendMessage } = useMitly();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const message = input.trim();
    setInput("");
    sendMessage(message);
  };

  const suggestions = [
    "What's my next meeting?",
    "Show my pending tasks",
    "What can you help me with?",
    "Summarize my recent activity",
  ];

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="outline" className="text-green-600 border-green-600">Connected</Badge>;
      case 'connecting':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Connecting...</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 border-red-600">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Disconnected</Badge>;
    }
  };

  return (
    <div className="h-[calc(100vh-10rem)]">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              MITLY AI Assistant
            </h1>
            <p className="text-muted-foreground">Ask questions about your meetings, tasks, and dashboard data</p>
          </div>
          {getStatusBadge()}
        </div>
      </div>

      {status === 'error' && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to connect to MITLY. Please check your connection and try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      <Card className="h-[calc(100%-5rem)] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat
          </CardTitle>
          <CardDescription>
            Get instant answers about your data
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 px-6" ref={scrollRef}>
            <div className="space-y-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4">
              <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={isProcessing || status !== 'connected'}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isProcessing || status !== 'connected'}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
