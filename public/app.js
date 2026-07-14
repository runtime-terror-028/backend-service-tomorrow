// app.js - Common UI interactions and utilities

export function initModal(modalId, btnOpenId, btnCloseIds) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const openModal = () => modal.classList.add('active');
    const closeModal = () => modal.classList.remove('active');

    if (btnOpenId) {
        const btnOpen = document.getElementById(btnOpenId);
        if (btnOpen) btnOpen.addEventListener('click', openModal);
    }

    if (btnCloseIds) {
        btnCloseIds.forEach(id => {
            const btnClose = document.getElementById(id);
            if (btnClose) btnClose.addEventListener('click', closeModal);
        });
    }

    return { openModal, closeModal };
}

export function populateDatalist(datalistId, items, valueKey, labelKey) {
    const datalist = document.getElementById(datalistId);
    if (!datalist) return;
    
    datalist.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        if (labelKey) {
            option.textContent = item[labelKey];
        }
        datalist.appendChild(option);
    });
}
