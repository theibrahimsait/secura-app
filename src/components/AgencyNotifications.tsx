
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, CheckCircle, Clock, FileText, User, Eye, MessageSquare } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  metadata: any;
  client_id?: string;
  agent_id?: string;
  property_id?: string;
}

interface AgencyNotificationsProps {
  agencyId: string;
}

const AgencyNotifications = ({ agencyId }: AgencyNotificationsProps) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  useEffect(() => {
    loadNotifications();
  }, [agencyId]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('agency_notifications')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('agency_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewProperty = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'property_submitted':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'client_registered':
        return <User className="w-5 h-5 text-green-500" />;
      case 'document_uploaded':
        return <FileText className="w-5 h-5 text-purple-500" />;
      case 'task_completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secura-lime"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications ({notifications.filter(n => !n.is_read).length} unread)
            </CardTitle>
            {notifications.some(n => !n.is_read) && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
                    const { error } = await supabase
                      .from('agency_notifications')
                      .update({ is_read: true, read_at: new Date().toISOString() })
                      .in('id', unreadIds);

                    if (error) throw error;
                    await loadNotifications();
                  } catch (error) {
                    console.error('Error marking all as read:', error);
                  }
                }}
              >
                Mark All Read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notification.is_read 
                      ? 'bg-white border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                  onClick={() => handleViewProperty(notification)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-sm text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <Badge className="bg-blue-500 text-white text-xs ml-2">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center">
                  {getNotificationIcon(selectedNotification.type)}
                  <span className="ml-2">{selectedNotification.title}</span>
                </CardTitle>
                <CardDescription>
                  {formatTime(selectedNotification.created_at)}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNotification(null)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">{selectedNotification.message}</p>
              
              {selectedNotification.metadata && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Details:</h4>
                  <div className="space-y-2 text-sm">
                    {selectedNotification.metadata.property_title && (
                      <div>
                        <span className="font-medium">Property:</span> {selectedNotification.metadata.property_title}
                      </div>
                    )}
                    {selectedNotification.metadata.property_location && (
                      <div>
                        <span className="font-medium">Location:</span> {selectedNotification.metadata.property_location}
                      </div>
                    )}
                    {selectedNotification.metadata.client_name && (
                      <div>
                        <span className="font-medium">Client:</span> {selectedNotification.metadata.client_name}
                      </div>
                    )}
                    {selectedNotification.metadata.agent_name && (
                      <div>
                        <span className="font-medium">Agent:</span> {selectedNotification.metadata.agent_name}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                {selectedNotification.property_id && (
                  <Button 
                    size="sm" 
                    className="bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                    onClick={() => {
                      // Navigate to task manager with property highlighted
                      const url = new URL(window.location.href);
                      url.searchParams.set('tab', 'tasks');
                      url.searchParams.set('highlight', selectedNotification.property_id!);
                      window.location.href = url.toString();
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Manage Property
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgencyNotifications;
