export default class ChatWidget {
    constructor() {
        this.config = window.agenticAiConfig || {};
        this.contextToken = null; // Will be fetched
        this.isOpen = false;

        this.elements = {
            toggle: document.getElementById('agentic-chat-toggle'),
            close: document.getElementById('agentic-chat-close'),
            container: document.getElementById('agentic-chat-container'),
            messages: document.getElementById('agentic-chat-messages'),
            form: document.getElementById('agentic-chat-form'),
            input: document.getElementById('agentic-chat-input'),
            typingIndicator: document.getElementById('agentic-typing-indicator')
        };

        this.init();
    }

    async init() {
        this.attachEventListeners();
        this.applyCustomStyles();

        // Fetch current context token from Shopware API to ensure we have the correct session
        await this.fetchContextToken();
    }

    async fetchContextToken() {
        try {
            // Use the shop URL to call the Storefront API Context Endpoint
            // This relies on the browser sending the session cookie automatically
            const accessKey = this.config.swAccessKey;
            const shopUrl = this.config.shopUrl;

            if (!accessKey || !shopUrl) {
                console.error('AgenticAI: Missing configuration (swAccessKey or shopUrl)');
                return;
            }

            // Use the custom controller endpoint which is designed for this plugin
            const response = await fetch('/agentic-ai/context', {
                method: 'GET',
                cache: 'no-store', // Prevent caching
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.token) {
                    this.contextToken = data.token;
                    // Update sessionStorage just for debugging/reference, but we rely on this fetched token
                    sessionStorage.setItem('agenticAiContext', this.contextToken);
                    console.log('AgenticAI: Context token initialized', this.contextToken);
                }
            } else {
                console.warn('AgenticAI: Failed to fetch context token', response.status);
            }
        } catch (e) {
            console.error('AgenticAI: Error fetching context token', e);
        }
    }

    attachEventListeners() {
        this.elements.toggle.addEventListener('click', () => this.toggleChat());
        this.elements.close.addEventListener('click', () => this.toggleChat());
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    applyCustomStyles() {
        const primaryColor = this.config.primaryColor || '#007bff';
        const position = this.config.position || 'bottom-right';

        document.documentElement.style.setProperty('--agentic-primary-color', primaryColor);

        if (position === 'bottom-left') {
            this.elements.toggle.style.left = '20px';
            this.elements.toggle.style.right = 'auto';
            this.elements.container.style.left = '20px';
            this.elements.container.style.right = 'auto';
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.elements.container.style.display = 'flex';
            this.elements.toggle.style.display = 'none';
            this.elements.input.focus();

            // Refresh context token when opening chat to ensure we have the latest session
            // forcing a re-fetch in case user logged in/out without page reload
            this.fetchContextToken();
        } else {
            this.elements.container.style.display = 'none';
            this.elements.toggle.style.display = 'flex';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const message = this.elements.input.value.trim();
        if (!message) return;

        // Display user message
        this.addMessage(message, 'user');
        this.elements.input.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // CRITICAL: Ensure we have the latest context token before sending
            // This fixes the race condition where a user logs in and immediately types
            await this.fetchContextToken();

            const response = await this.sendMessage(message);
            this.hideTypingIndicator();
            this.handleResponse(response);
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
            console.error('Chat error:', error);
        }
    }

    async sendMessage(message) {
        const payload = {
            message: message,
            swAccessKey: this.config.swAccessKey,
            shopUrl: this.config.shopUrl
        };

        // Include context token if available
        if (this.contextToken) {
            payload.swContextToken = this.contextToken;
        }

        const response = await fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    }

    handleResponse(response) {
        // Update context token if provided
        if (response.context && response.context.swContextToken) {
            this.contextToken = response.context.swContextToken;
            sessionStorage.setItem('agenticAiContext', this.contextToken);
        }

        // Display message
        if (response.message) {
            this.addMessage(response.message, 'bot');
        }

        // Handle different response types
        switch (response.type) {
            case 'product_list':
                this.renderProductList(response.data);
                break;
            case 'product_detail':
                this.renderProductDetail(response.data);
                break;
            case 'order_list':
                this.renderOrderList(response.data);
                break;
            case 'cart_list':
                this.renderCartList(response.data);
                break;
            case 'text':
            default:
                // Text already added above
                break;
        }
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `agentic-message agentic-message-${sender}`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'agentic-message-content';

        // Handle newlines in text
        contentDiv.innerHTML = content.replace(/\n/g, '<br>');

        messageDiv.appendChild(contentDiv);
        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    renderProductList(data) {
        if (!data || !data.results || data.results.length === 0) return;

        const productsContainer = document.createElement('div');
        productsContainer.className = 'agentic-products-container';

        data.results.forEach(product => {
            const productCard = this.createProductCard(product);
            productsContainer.appendChild(productCard);
        });

        // Add pagination info if available
        if (data.pagination && data.pagination.hasNextPage) {
            const paginationInfo = document.createElement('div');
            paginationInfo.className = 'agentic-pagination-info';
            paginationInfo.textContent = `Showing ${data.results.length} of ${data.pagination.total} products`;
            productsContainer.appendChild(paginationInfo);
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'agentic-message agentic-message-bot';
        messageDiv.appendChild(productsContainer);

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'agentic-product-card';

        const imageUrl = product.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';

        card.innerHTML = `
            <a href="${product.url || '#'}" class="agentic-product-link" target="_blank">
                <div class="agentic-product-image">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy" />
                    ${product.stock > 0 ? '' : '<span class="agentic-product-badge out-of-stock">Out of Stock</span>'}
                </div>
                <div class="agentic-product-info">
                    <h4 class="agentic-product-name">${product.name}</h4>
                    ${product.productNumber ? `<p class="agentic-product-number">${product.productNumber}</p>` : ''}
                    ${product.options && product.options.length > 0 ? `
                        <div class="agentic-product-options">
                            ${product.options.map(opt => `<span class="agentic-option-badge">${opt.option}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="agentic-product-footer">
                        <span class="agentic-product-price">€${product.price.toFixed(2)}</span>
                        ${product.stock > 0 ? `<span class="agentic-product-stock">${product.stock} in stock</span>` : ''}
                    </div>
                </div>
            </a>
        `;

        return card;
    }

    renderProductDetail(product) {
        if (!product) return;

        const detailContainer = document.createElement('div');
        detailContainer.className = 'agentic-product-detail';

        const imageUrl = product.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';

        detailContainer.innerHTML = `
            <a href="${product.url || '#'}" class="agentic-product-detail-link" target="_blank">
                <div class="agentic-product-detail-image">
                    <img src="${imageUrl}" alt="${product.name}" />
                </div>
                <div class="agentic-product-detail-info">
                    <h3>${product.name}</h3>
                    ${product.productNumber ? `<p class="agentic-product-number">${product.productNumber}</p>` : ''}
                    <div class="agentic-product-price-large">€${product.price.toFixed(2)}</div>
                    ${product.stock !== undefined ? `<p class="agentic-stock-info">${product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}</p>` : ''}
                    ${product.options && product.options.length > 0 ? `
                        <div class="agentic-product-options">
                            ${product.options.map(opt => `<div><strong>${opt.group}:</strong> ${opt.option}</div>`).join('')}
                        </div>
                    ` : ''}
                    <div class="agentic-product-cta">
                        <span>View full details →</span>
                    </div>
                </div>
            </a>
        `;

        const messageDiv = document.createElement('div');
        messageDiv.className = 'agentic-message agentic-message-bot';
        messageDiv.appendChild(detailContainer);

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    renderOrderList(data) {
        if (!data || !data.results || data.results.length === 0) return;

        const ordersContainer = document.createElement('div');
        ordersContainer.className = 'agentic-orders-container';

        data.results.forEach(order => {
            const orderCard = document.createElement('div');
            orderCard.className = 'agentic-order-card';

            orderCard.innerHTML = `
                <div class="agentic-order-header">
                    <span class="agentic-order-number">Order #${order.orderNumber || order.id}</span>
                    <span class="agentic-order-status agentic-order-status-${(order.status || '').toLowerCase()}">${order.status || 'Unknown'}</span>
                </div>
                ${order.date ? `<p class="agentic-order-date">${new Date(order.date).toLocaleDateString()}</p>` : ''}
                ${order.total ? `<p class="agentic-order-total">Total: €${order.total.toFixed(2)}</p>` : ''}
                ${order.items ? `<p class="agentic-order-items">${order.items} item(s)</p>` : ''}
            `;

            ordersContainer.appendChild(orderCard);
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'agentic-message agentic-message-bot';
        messageDiv.appendChild(ordersContainer);

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    renderCartList(data) {
        if (!data || !data.results || data.results.length === 0) return;

        const cartContainer = document.createElement('div');
        cartContainer.className = 'agentic-products-container'; // Reuse product container style

        // Header for Cart Total
        const header = document.createElement('div');
        header.className = 'agentic-cart-header';
        header.style.marginBottom = '10px';
        header.style.fontWeight = 'bold';
        header.textContent = `Cart Total: €${data.total ? data.total.toFixed(2) : '0.00'}`;
        cartContainer.appendChild(header);

        data.results.forEach(item => {
            // Reuse createProductCard logic but slightly modified for cart (e.g., showing quantity)
            // For now, map item fields to product fields
            const product = {
                name: item.name,
                price: item.price, // This is total price for the line item
                imageUrl: item.imageUrl,
                url: '#', // Cart items might not link to product page easily without SEO URL
                stock: item.quantity, // Hack: Use stock to show quantity for now, or custom HTML
                productNumber: item.productNumber
            };

            // Create custom card for cart item to be explicit about Quantity
            const card = document.createElement('div');
            card.className = 'agentic-product-card';

            const imageUrl = item.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';

            card.innerHTML = `
                <div class="agentic-product-link" style="cursor: default; text-decoration: none;">
                    <div class="agentic-product-image">
                        <img src="${imageUrl}" alt="${item.name}" loading="lazy" />
                        <span class="agentic-product-badge" style="background-color: #28a745;">Qty: ${item.quantity}</span>
                    </div>
                    <div class="agentic-product-info">
                        <h4 class="agentic-product-name">${item.name}</h4>
                        ${item.productNumber ? `<p class="agentic-product-number">${item.productNumber}</p>` : ''}
                        <div class="agentic-product-footer">
                            <span class="agentic-product-price">Total: €${item.price.toFixed(2)}</span>
                            <span class="agentic-product-stock">@ €${item.unitPrice ? item.unitPrice.toFixed(2) : ''} / each</span>
                        </div>
                    </div>
                </div>
            `;

            cartContainer.appendChild(card);
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'agentic-message agentic-message-bot';
        messageDiv.appendChild(cartContainer);

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.elements.typingIndicator.style.display = 'flex';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.elements.typingIndicator.style.display = 'none';
    }

    scrollToBottom() {
        setTimeout(() => {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }, 100);
    }
}
