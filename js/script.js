document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registrationForm');
    const formParts = document.querySelectorAll('.form-part');
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const progressDots = document.querySelectorAll('.dot');
    let currentStep = 1;

    const modal = document.getElementById('modal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalMessage = modal.querySelector('.modal-message');
    const closeModalButton = document.querySelector('.close-button');

    const resumeInput = document.getElementById('resume');
    const fileNameDisplay = document.getElementById('file-name');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Helper function to show the custom modal with dynamic content
    const showModal = (title, message) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.classList.add('show');
    };

    // Prefs logic for the dropdowns
    const firstPrefSelect = document.getElementById('firstPref');
    const secondPrefSelect = document.getElementById('secondPref');
    const allOptions = [
    { value: 'Treasurer', text: 'Treasurer' },
    { value: 'Web Development Lead', text: 'Web Development Lead' },
    { value: 'App Dev Lead', text: 'App Dev Lead' },
    { value: 'PR & Outreach Lead', text: 'PR & Outreach Lead' },
    { value: 'Event Manager', text: 'Event Manager' },
    { value: 'Executive', text: 'Executive' },
    { value: 'Marketing & Design Lead', text: 'Marketing & Design Lead' }
];

    const updateSecondPref = () => {
        const selectedValue = firstPrefSelect.value;
        secondPrefSelect.innerHTML = '<option value="" disabled selected>Select second preference</option>';
        const availableOptions = allOptions.filter(option => option.value !== selectedValue);
        availableOptions.forEach(option => {
            const newOption = document.createElement('option');
            newOption.value = option.value;
            newOption.textContent = option.text;
            secondPrefSelect.appendChild(newOption);
        });
    };
    
    if (firstPrefSelect) {
        firstPrefSelect.addEventListener('change', updateSecondPref);
    }

    // Real-time validation logic
    const validateField = (input) => {
        let isFieldValid = true;

        if (input.id === 'scholarNo') {
            isFieldValid = false;
        } else if (!input.checkValidity()) {
            isFieldValid = false;
        }

        if (isFieldValid) {
            input.classList.remove('invalid');
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
            input.classList.add('invalid');
        }
    };

    const addValidationListeners = (step) => {
        const currentStepEl = document.querySelector(`.form-part[data-step="${step}"]`);
        const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('input', () => validateField(input));
        });
    };

    // Multi-step form logic
    const showStep = (step) => {
        const activePart = document.querySelector(`.form-part[data-step="${step}"]`);
        
        formParts.forEach(part => {
            part.classList.remove('active');
        });

        if (activePart) {
            activePart.classList.add('active');
        }

        progressDots.forEach(dot => {
            dot.classList.remove('active');
            if (parseInt(dot.dataset.step) === step) {
                dot.classList.add('active');
            }
        });

        addValidationListeners(step);
    };

    const validateStep = (step) => {
        const currentStepEl = document.querySelector(`.form-part[data-step="${step}"]`);
        const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
        let isValid = true;
        inputs.forEach(input => {
            if (input.id === 'scholarNo' && input.value.length !== 8) {
                isValid = false;
            }
            if (!input.checkValidity()) {
                isValid = false;
                input.reportValidity();
            }
        });
        return isValid;
    };

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (validateStep(currentStep)) {
                currentStep++;
                showStep(currentStep);
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentStep--;
            showStep(currentStep);
        });
    });

    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (validateStep(currentStep)) {
        const formData = new FormData(form);

        const API_ENDPOINT = 'https://perceptron-recruitment.onrender.com/submissions'; 
        
        loadingOverlay.classList.add('active');
        
        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                showModal('Registration Successful!', 'Your details have been submitted. Welcome to Perceptron!');
            } else {
                const errorData = await response.json();
                console.error('API Error:', response.status, response.statusText, errorData.error);
                showModal('Submission Failed', errorData.error || `Server responded with status ${response.status}`);
            }
        } catch (error) {
            console.error('Network Error:', error);
            showModal('Network Error', `A network error occurred: ${error.message}. Check your connection or server.`);
        } finally {
            loadingOverlay.classList.remove('active');
        }
    }
});


    closeModalButton.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });

    if (resumeInput) {
        resumeInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0] ? e.target.files[0].name : 'No file chosen';
            fileNameDisplay.textContent = fileName;
        });
    }

    showStep(currentStep); // Initial step
});
