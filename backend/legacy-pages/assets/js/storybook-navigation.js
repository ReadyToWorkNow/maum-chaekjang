// Storybook Page Navigation
class StorybookNavigator {
    constructor() {
        this.pages = [];
        this.currentPageIndex = 0;
        this.totalPages = 0;
        this.navigationEnabled = false;
    }

    init(pages) {
        this.pages = pages;
        this.totalPages = pages.length;
        this.currentPageIndex = 0;
        this.navigationEnabled = true;

        console.log(`Log: StorybookNavigator initialized with ${this.totalPages} pages`);

        // Setup keyboard navigation
        this.setupKeyboardNavigation();

        // Setup click navigation
        this.setupClickNavigation();

        // Setup page indicator
        this.createPageIndicator();

        // Show first page
        this.showPage(0);
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.navigationEnabled) return;

            switch(e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    this.previousPage();
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                case ' ': // Spacebar
                    e.preventDefault();
                    this.nextPage();
                    break;
                case 'Home':
                    e.preventDefault();
                    this.goToPage(0);
                    break;
                case 'End':
                    e.preventDefault();
                    this.goToPage(this.totalPages - 1);
                    break;
            }
        });

        console.log('⌨️ Keyboard navigation enabled');
    }

    setupClickNavigation() {
        const contentContainer = document.getElementById('storybookContent');
        if (!contentContainer) return;

        // Create navigation overlays
        const leftNav = document.createElement('div');
        leftNav.className = 'storybook-nav-left';
        leftNav.innerHTML = '<span>◄</span>';
        leftNav.addEventListener('click', () => this.previousPage());

        const rightNav = document.createElement('div');
        rightNav.className = 'storybook-nav-right';
        rightNav.innerHTML = '<span>►</span>';
        rightNav.addEventListener('click', () => this.nextPage());

        contentContainer.appendChild(leftNav);
        contentContainer.appendChild(rightNav);

        console.log('Click: Click navigation enabled');
    }

    createPageIndicator() {
        // Check if indicator already exists
        let indicator = document.getElementById('page-indicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'page-indicator';
            indicator.className = 'page-indicator';

            const contentContainer = document.getElementById('storybookContent');
            if (contentContainer) {
                contentContainer.parentElement.insertBefore(indicator, contentContainer.nextSibling);
            }
        }

        this.updatePageIndicator();

        console.log('PageIndicator: Page indicator created');
    }

    updatePageIndicator() {
        const indicator = document.getElementById('page-indicator');
        if (!indicator) return;

        indicator.innerHTML = '';

        for (let i = 0; i < this.totalPages; i++) {
            const dot = document.createElement('span');
            dot.className = 'page-dot';
            if (i === this.currentPageIndex) {
                dot.classList.add('active');
            }
            dot.addEventListener('click', () => this.goToPage(i));
            indicator.appendChild(dot);
        }
    }

    showPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.totalPages) return;

        this.currentPageIndex = pageIndex;

        // Hide all pages
        const allPages = document.querySelectorAll('.storybook-page');
        allPages.forEach((page, index) => {
            if (index === pageIndex) {
                page.style.display = 'block';
                page.classList.add('page-active');
                page.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                page.style.display = 'none';
                page.classList.remove('page-active');
            }
        });

        // Update indicator
        this.updatePageIndicator();

        // Update navigation button states
        this.updateNavigationStates();

        // Emit event
        this.emitPageChangeEvent();

        console.log(`Page: Showing page ${pageIndex + 1}/${this.totalPages}`);
    }

    nextPage() {
        if (this.currentPageIndex < this.totalPages - 1) {
            this.showPage(this.currentPageIndex + 1);
        } else {
            console.log('Log: Already at last page');
        }
    }

    previousPage() {
        if (this.currentPageIndex > 0) {
            this.showPage(this.currentPageIndex - 1);
        } else {
            console.log('Log: Already at first page');
        }
    }

    goToPage(pageIndex) {
        if (pageIndex >= 0 && pageIndex < this.totalPages) {
            this.showPage(pageIndex);
        }
    }

    updateNavigationStates() {
        const leftNav = document.querySelector('.storybook-nav-left');
        const rightNav = document.querySelector('.storybook-nav-right');

        if (leftNav) {
            if (this.currentPageIndex === 0) {
                leftNav.classList.add('disabled');
            } else {
                leftNav.classList.remove('disabled');
            }
        }

        if (rightNav) {
            if (this.currentPageIndex === this.totalPages - 1) {
                rightNav.classList.add('disabled');
            } else {
                rightNav.classList.remove('disabled');
            }
        }
    }

    emitPageChangeEvent() {
        const event = new CustomEvent('storybook-page-change', {
            detail: {
                currentPage: this.currentPageIndex,
                totalPages: this.totalPages
            }
        });
        document.dispatchEvent(event);
    }

    enable() {
        this.navigationEnabled = true;
    }

    disable() {
        this.navigationEnabled = false;
    }
}

// Global navigator instance
window.storybookNavigator = null;

// Initialize when storybook is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Listen for storybook loaded event
    document.addEventListener('storybook-loaded', function(e) {
        console.log('Log: Storybook loaded event received');
        const storybook = e.detail.storybook;

        window.storybookNavigator = new StorybookNavigator();
        window.storybookNavigator.init(storybook.pages);

        console.log('✅ Storybook navigation ready');
    });

    // Fallback: Wait for storybook to be loaded
    setTimeout(() => {
        if (!window.storybookNavigator) {
            const storybookData = localStorage.getItem('currentStorybook');

            if (storybookData) {
                const storybook = JSON.parse(storybookData);

                window.storybookNavigator = new StorybookNavigator();
                window.storybookNavigator.init(storybook.pages);

                console.log('✅ Storybook navigation ready (fallback)');
            }
        }
    }, CONFIG.TIMING.NAVIGATION_INIT_DELAY);
});

// Listen to storybook page changes
document.addEventListener('storybook-page-change', (e) => {
    console.log(`Page changed: ${e.detail.currentPage + 1}/${e.detail.totalPages}`);
});

console.log('Navigation: Storybook navigation script loaded');
