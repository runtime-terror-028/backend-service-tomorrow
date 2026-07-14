// api.js - Centralized API calls for the frontend

export async function getTickets() {
    const response = await fetch('/api/tickets');
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return await response.json();
}

export async function getTicketDetails(ticketId) {
    const response = await fetch(`/api/tickets/${ticketId}`);
    if (!response.ok) throw new Error('Failed to fetch ticket details');
    return await response.json();
}

export async function createTicket(payload) {
    const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to create ticket');
    return await response.json();
}

export async function getServers() {
    const response = await fetch('/api/cmdb');
    if (!response.ok) throw new Error('Failed to fetch servers');
    return await response.json();
}
