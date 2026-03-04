
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';

/**
 * YouTube-style Stateful/Parallel Routing Service
 * Matches the requested feature set:
 * 1. History: Multiple separate lists for each main tab.
 * 2. Back Button: Tab-aware or jumps to roots.
 * 3. Loops: Prevents circular navigation.
 */

interface TabState {
    lastPath: string;
    stack: string[];
}

interface RoleRoutingState {
    tabs: Record<string, TabState>;
    lastActiveTab: string;
}

// Global state using SessionStorage for persistence
const STORAGE_KEY = 'acro_routing_state';

const getInitialState = (): Record<string, RoleRoutingState> => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse routing state", e);
        }
    }
    return {};
};

const saveState = (state: Record<string, RoleRoutingState>) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const useParallelRouting = (role: string, tabs: string[]) => {
    const location = useLocation();
    const navigate = useNavigate();
    const stateRef = useRef<Record<string, RoleRoutingState>>(getInitialState());

    // Initialize role state if not exists
    if (!stateRef.current[role]) {
        stateRef.current[role] = {
            tabs: {},
            lastActiveTab: tabs[0]
        };
        tabs.forEach(t => {
            stateRef.current[role].tabs[t] = {
                lastPath: `/${role}/${t}`,
                stack: [`/${role}/${t}`]
            };
        });
    }

    // Effect to track current position and update stacks
    useEffect(() => {
        const path = location.pathname;
        const activeTab = tabs.find(t => path.startsWith(`/${role}/${t}`));

        if (activeTab) {
            const roleState = stateRef.current[role];
            const tabState = roleState.tabs[activeTab];

            // Update last visited path for this tab
            tabState.lastPath = path;
            roleState.lastActiveTab = activeTab;

            // Handle Stack (prevent loops & manage history)
            const currentStack = [...tabState.stack];
            const lastIndex = currentStack.indexOf(path);

            if (lastIndex !== -1) {
                // Reordering to prevent loops: if we revisit a page, clear everything after it
                tabState.stack = currentStack.slice(0, lastIndex + 1);
            } else {
                // Push new page to stack
                tabState.stack.push(path);
            }

            saveState(stateRef.current);
        }
    }, [location.pathname, role, tabs]);

    const handleTabClick = (tabName: string) => {
        const roleState = stateRef.current[role];
        const tabState = roleState.tabs[tabName];
        const activeTab = tabs.find(t => location.pathname.startsWith(`/${role}/${t}`));

        if (activeTab === tabName) {
            // Second click on active tab -> Go to root
            const rootPath = `/${role}/${tabName}`;
            if (location.pathname !== rootPath) {
                navigate(rootPath);
            }
        } else {
            // Switch to another tab -> Go to its last known path
            navigate(tabState.lastPath);
        }
    };

    const goBack = () => {
        const activeTab = tabs.find(t => location.pathname.startsWith(`/${role}/${t}`));
        if (!activeTab) {
            navigate(-1);
            return;
        }

        const tabState = stateRef.current[role].tabs[activeTab];
        if (tabState.stack.length > 1) {
            // Pop from current tab stack
            const newStack = [...tabState.stack];
            newStack.pop(); // Remove current
            const prevPath = newStack[newStack.length - 1];
            tabState.stack = newStack;
            saveState(stateRef.current);
            navigate(prevPath);
        } else {
            // At root of tab
            // YouTube behavior: might exit or go back to previous tab
            // For web, let's just use standard back if at root, or do nothing.
            navigate(-1);
        }
    };

    return {
        handleTabClick,
        goBack,
        activeTab: tabs.find(t => location.pathname.startsWith(`/${role}/${t}`)) || tabs[0],
        getTabPath: (tabName: string) => stateRef.current[role].tabs[tabName]?.lastPath || `/${role}/${tabName}`
    };
};
