import { useEffect, useRef, useState } from "react";
import ChatItem from "./chat-item";
import { sendChatRequest } from "@/api/chat";
import type { ChatMessage } from "@/api/chat";
import type { Product } from "@/api/products";
import { ArrowUpRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ChatBoxProps {
  onClose: () => void;
  products: Product[];
  setQuantities: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function ChatBox({ onClose, products, setQuantities }: ChatBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: "Welcome to Version Coffee! I’m here to help with anything you’d like to know about our store or menu. What can I get started for you today?" }]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!inputRef.current?.value || isLoading) return;

    const userMessage = inputRef.current.value;
    inputRef.current.value = "";

    const userChat: ChatMessage = { role: "user", content: userMessage };
    const updatedMessages = [...messages, userChat];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await sendChatRequest(updatedMessages);
      setMessages((prev) => [...prev, response]);

      // Sync chatbot order to store quantities
      if (response.memory?.agent === "order_taking_agent" && response.memory?.order) {
        const order = response.memory.order as { item: string; quantity: number }[];
        const newQuantities: Record<string, number> = {};
        for (const orderItem of order) {
          const product = products.find(
            (p) => p.name.toLowerCase() === orderItem.item.toLowerCase()
          );
          if (product) {
            newQuantities[product._id] = orderItem.quantity;
          }
        }
        setQuantities(newQuantities);
      }
    } catch {
      toast.error("Failed to send message.");
      // Remove the user message on failure
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll when messages change or loading state changes
  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    });
  }, [messages.length, isLoading]);

  return (
    <div className="fixed bottom-25 right-4 md:right-8 w-[calc(100%-2rem)] md:w-[28rem] h-[32rem] bg-background border border-primary rounded-2xl shadow-xl flex flex-col z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-muted">
        <h2 className="text-lg font-bold text-primary">Chatbot</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea className="h-full">
          <div className="p-4">
            {messages.length > 0 ? (
              <>
                {messages.map((message, index) => (
                  <ChatItem
                    key={index}
                    role={message.role}
                    content={message.content}
                  />
                ))}
                {isLoading && (
                  <ChatItem
                    role="assistant"
                    content="Thinking..."
                    useSpinner={true}
                  />
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground text-center">
                  Ask a question or start a conversation.
                </p>
              </div>
            )}
            <div ref={messagesEndRef} className="pt-4" />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="p-3 bg-muted">
        <Card className="shadow-none border-0 p-0 bg-transparent">
          <CardContent className="flex gap-2 p-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex gap-2 w-full"
            >
              <Input
                placeholder="Enter your message..."
                ref={inputRef}
                disabled={isLoading}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={isLoading}
              >
                <ArrowUpRight />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ChatBox;
