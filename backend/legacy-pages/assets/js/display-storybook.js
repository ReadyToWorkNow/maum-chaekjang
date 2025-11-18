// Display storybook on generic.html
document.addEventListener('DOMContentLoaded', function() {
    loadAndDisplayStorybook();
});

function loadAndDisplayStorybook() {
    // Get storybook data from localStorage
    const storybookData = localStorage.getItem('currentStorybook');

    if (!storybookData) {
        // No storybook found
        document.getElementById('storybookTitle').style.display = 'none';
        document.getElementById('storybookSubtitle').style.display = 'none';
        document.getElementById('noStoryMessage').style.display = 'block';
        return;
    }

    try {
        const storybook = JSON.parse(storybookData);

        // Update title
        document.getElementById('storybookTitle').textContent = storybook.title;
        document.getElementById('storybookSubtitle').textContent = `${storybook.childName}를 위한 특별한 치유 이야기`;

        // Display all pages
        const contentContainer = document.getElementById('storybookContent');
        contentContainer.innerHTML = '';

        storybook.pages.forEach((page, index) => {
            const pageElement = createPageElement(page, index);
            contentContainer.appendChild(pageElement);

            // Add separator between pages (except after last page)
            if (index < storybook.pages.length - 1) {
                const separator = document.createElement('hr');
                separator.style.margin = '3em 0';
                separator.style.border = '0';
                separator.style.borderTop = '2px solid rgba(255,255,255,0.1)';
                contentContainer.appendChild(separator);
            }
        });

        // Show navigation buttons
        document.getElementById('storybookNavigation').style.display = 'block';

        // Show TTS controls
        document.getElementById('tts-controls').style.display = 'block';

        // Emit storybook loaded event for TTS and navigation
        const event = new CustomEvent('storybook-loaded', {
            detail: { storybook }
        });
        document.dispatchEvent(event);
        console.log('📢 Storybook loaded event dispatched');

    } catch (error) {
        console.error('Error loading storybook:', error);
        document.getElementById('storybookTitle').textContent = '오류 발생';
        document.getElementById('storybookSubtitle').textContent = '동화책을 불러오는 중 오류가 발생했습니다.';
        document.getElementById('storybookContent').innerHTML = `
            <p style="text-align: center; padding: 2em 0;">
                동화책을 불러올 수 없습니다. 다시 시도해주세요.
            </p>
        `;
    }
}




function createPageElement(page, index) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'storybook-page';
    pageDiv.style.marginBottom = '2em';

    // Page number badge
    const pageBadge = document.createElement('span');
    pageBadge.className = 'date';
    pageBadge.textContent = `페이지 ${page.number}`;
    pageBadge.style.display = 'inline-block';
    pageBadge.style.marginBottom = '1em';

    // Page title (show only on first page)
    let pageTitle = null;
    if (index === 0) {
        pageTitle = document.createElement('h2');
        pageTitle.textContent = page.title;
        pageTitle.style.marginBottom = '1.5em';
    }

    // Page image
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image main';
    imageContainer.style.marginBottom = '2em';
    imageContainer.style.maxWidth = '800px';
    imageContainer.style.margin = '0 auto 2em auto';
    imageContainer.style.textAlign = 'center';

    const pageImage = document.createElement('img');
    pageImage.src = page.imageUrl;
    pageImage.alt = page.title;
    pageImage.style.borderRadius = '8px';
    pageImage.onerror = function() {
        // If image fails to load, use a placeholder
        this.src = 'images/pic01.jpg';
    };

    imageContainer.appendChild(pageImage);

    // Page content
    const pageContent = document.createElement('div');
    pageContent.className = 'storybook-text';

    // Split content by paragraphs and create p elements
    const paragraphs = page.content.split('\n\n').filter(p => p.trim().length > 0);
    paragraphs.forEach(paragraphText => {
        const paragraph = document.createElement('p');
        paragraph.textContent = paragraphText.trim();
        paragraph.style.fontSize = '1.1em';
        paragraph.style.lineHeight = '1.8';
        paragraph.style.marginBottom = '1em';
        pageContent.appendChild(paragraph);
    });

    // Assemble page
    pageDiv.appendChild(pageBadge);
    if (pageTitle) pageDiv.appendChild(pageTitle);
    pageDiv.appendChild(imageContainer);
    pageDiv.appendChild(pageContent);

    return pageDiv;
}






// Function to print the storybook
function printStorybook() {
    // Hide navigation buttons before printing
    const navigation = document.getElementById('storybookNavigation');
    const originalDisplay = navigation.style.display;
    navigation.style.display = 'none';

    // Print
    window.print();

    // Restore navigation buttons
    navigation.style.display = originalDisplay;
}

// Add print styles
const printStyles = document.createElement('style');
printStyles.textContent = `
    @media print {
        /* Hide navigation and footer when printing */
        #nav, #footer, #copyright, #storybookNavigation {
            display: none !important;
        }

        /* Optimize page layout for printing */
        .storybook-page {
            page-break-inside: avoid;
            page-break-after: always;
        }

        /* Ensure images print well */
        .image.main img {
            max-width: 100%;
            height: auto;
        }

        /* Better text readability for print */
        body {
            font-size: 12pt;
            line-height: 1.6;
        }

        h1, h2 {
            color: #000;
        }

        p {
            color: #333;
        }
    }
`;
document.head.appendChild(printStyles);
