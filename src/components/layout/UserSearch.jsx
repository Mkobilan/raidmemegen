import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';

const UserSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const { searchUsers } = useProfile();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                const users = await searchUsers(query);
                setResults(users);
                setIsLoading(false);
                setShowResults(true);
            } else {
                setResults([]);
                setShowResults(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelectUser = (username) => {
        navigate(`/profile/${username}`);
        setQuery('');
        setShowResults(false);
    };

    return (
        <div className="relative max-w-md w-full mx-auto" ref={searchRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-700 rounded-full leading-5 bg-gray-800 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-gray-700 focus:text-white sm:text-sm transition-colors"
                    placeholder="Search users..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (query.length >= 2) setShowResults(true);
                    }}
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {showResults && (
                <div className="absolute mt-1 w-full bg-gray-800 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-700">
                    {isLoading ? (
                        <div className="px-4 py-2 text-sm text-gray-400">Searching...</div>
                    ) : results.length > 0 ? (
                        <ul>
                            {results.map((user) => (
                                <li key={user.username}>
                                    <button
                                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center space-x-3 transition-colors"
                                        onClick={() => handleSelectUser(user.username)}
                                    >
                                        <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center overflow-hidden shrink-0">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.username}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-white uppercase">
                                                    {user.displayName?.charAt(0) || user.username.charAt(0)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium truncate">{user.displayName || user.username}</span>
                                            <span className="text-xs text-gray-500 truncate">@{user.username}</span>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : query.length >= 2 ? (
                        <div className="px-4 py-2 text-sm text-gray-400">No users found</div>
                    ) : null}
                </div>
            )}
        </div>
    );
};

export default UserSearch;
