function toggleAccordion(element) {
    const content = element.nextElementSibling;
    content.classList.toggle('hidden');
    const arrow = element.querySelector('svg');
    arrow.classList.toggle('rotate-180');
}

// Smooth scrolling function
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a.smooth-scroll').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const headerOffset = 80; // Adjust this value based on your header height
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});


// Function to handle sticky header
function handleStickyHeader() {
    const header = document.querySelector('.sticky-header');
    const scrollPosition = window.scrollY;

    if (scrollPosition > 0) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Add event listener for scroll
window.addEventListener('scroll', handleStickyHeader);


