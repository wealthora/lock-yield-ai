import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UserOption {
  user_id: string;
  email: string | null;
  first_name: string | null;
  other_names: string | null;
}

interface UserSearchSelectProps {
  value: string | null;
  onChange: (userId: string | null, user: UserOption | null) => void;
  placeholder?: string;
}

export default function UserSearchSelect({
  value,
  onChange,
  placeholder = 'Select a user...',
}: UserSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, email, first_name, other_names')
          .order('email', { ascending: true });

        if (error) throw error;
        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const email = user.email?.toLowerCase() || '';
      const firstName = user.first_name?.toLowerCase() || '';
      const otherNames = user.other_names?.toLowerCase() || '';
      const fullName = `${firstName} ${otherNames}`.trim();
      
      return (
        email.includes(query) ||
        firstName.includes(query) ||
        otherNames.includes(query) ||
        fullName.includes(query) ||
        user.user_id.toLowerCase().includes(query)
      );
    });
  }, [users, searchQuery]);

  const selectedUser = users.find((user) => user.user_id === value);

  const getDisplayName = (user: UserOption) => {
    const name = [user.first_name, user.other_names].filter(Boolean).join(' ');
    if (name && user.email) return `${name} (${user.email})`;
    return user.email || user.user_id;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selectedUser ? getDisplayName(selectedUser) : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <CommandEmpty>No users found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.user_id}
                    value={user.user_id}
                    onSelect={() => {
                      const newValue = user.user_id === value ? null : user.user_id;
                      onChange(newValue, newValue ? user : null);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-2"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        value === user.user_id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">
                        {user.first_name || user.other_names
                          ? `${user.first_name || ''} ${user.other_names || ''}`.trim()
                          : 'No name'}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user.email || user.user_id}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
