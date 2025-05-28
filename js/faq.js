document.addEventListener('DOMContentLoaded', function() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const faqAnswer = faqItem.querySelector('.faq-answer');
            const icon = this.querySelector('.faq-icon');

            const isActive = this.classList.contains('active');

            faqQuestions.forEach(q => {
                q.classList.remove('active');
                q.parentElement.querySelector('.faq-answer').classList.remove('active');
                q.querySelector('.faq-icon').textContent = '+';
            });

            if (!isActive) {
                this.classList.add('active');
                faqAnswer.classList.add('active');
                icon.textContent = '×';
            }
        });
    });
});
