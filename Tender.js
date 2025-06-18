let categories = [];
let tenders = [];
let selectedCategory = null;
let searchTerm = '';
let currentPage = 1;
const tendersPerPage = 5;

const tendersContainer = document.getElementById('tendersContainer');
const tenderCount = document.getElementById('tenderCount');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const allCategoriesBtn = document.getElementById('allCategoriesBtn');
const categoryGrid = document.getElementById('categoryGrid');

// API Base URL
const apiUrl = 'http://localhost:5279';

// Fetch Categories and Tenders
async function fetchCategoriesAndTenders() {
  try {
    const response = await fetch(`${apiUrl}/api/Tender/get-all-categories`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (!data.$values || !Array.isArray(data.$values)) throw new Error('Invalid data format');
    categories = data.$values.map(cat => ({
      id: cat.categoryId,
      name: cat.categoryName,
      count: cat.tenders.$values.length,
      activeCount: cat.tenders.$values.filter(t => t.status === 1).length,
      tenders: cat.tenders.$values
    }));
    tenders = categories.flatMap(cat => cat.tenders.map(tender => ({
      ...tender,
      category: cat.name
    })));
    renderCategories();
    filterTenders();
  } catch (error) {
    console.error('Error fetching data:', error);
    alert('Failed to load data: ' + error.message);
  }
}

// Render Categories
function renderCategories() {
  if (!categoryGrid) return;
  categoryGrid.innerHTML = '';
  categories.forEach(category => {
    if (category.activeCount > 0) {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-2';
      col.innerHTML = `
        <div class="card text-center category-card" data-category="${category.id}" style="cursor: pointer;">
          <div class="card-body p-2">
            <div class="display-6 mb-2">${getCategoryIcon(category.name)}</div>
            <h6 class="card-title text-muted mb-1">${category.name}</h6>
            <span class="badge bg-light text-dark">${category.count.toLocaleString()}</span>
          </div>
        </div>
      `;
      categoryGrid.appendChild(col);
    }
  });
  addCategoryEventListeners();
}

function getCategoryIcon(categoryName) {
  const icons = {
    'Oil & Gas': '⛽', 'Medical Services': '🏥', 'Construction': '🏗️',
    'IT Services': '💻', 'Consulting': '👨‍💼', 'Manufacturing': '🏭',
    'Education': '🎓', 'Translation Services': '🌐', 'Maintenance': '🔧',
    'Logistics': '🚚', 'Financial Services': '💰',  
    
  };
  return icons[categoryName] || '📦';
}

// Add Event Listeners to Categories
function addCategoryEventListeners() {
  if (!categoryGrid) return;
  document.querySelectorAll('.category-card').forEach(button => {
    button.addEventListener('click', () => {
      selectedCategory = button.getAttribute('data-category');
      currentPage = 1;
      filterTenders();
      tendersContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// Render Tenders with Pagination
function renderTenders(tendersToRender) {
  if (!tendersContainer) return;
  tendersContainer.innerHTML = '';
  const activeTenders = tendersToRender.filter(t => t.status === 1);
  if (tenderCount) tenderCount.textContent = activeTenders.length;

  const startIndex = (currentPage - 1) * tendersPerPage;
  const endIndex = startIndex + tendersPerPage;
  const paginatedTenders = tendersToRender.slice(startIndex, endIndex);

  if (paginatedTenders.length === 0 && tendersToRender.length > 0 && currentPage > 1) {
    currentPage--;
    renderTenders(tendersToRender);
    return;
  }

  paginatedTenders.forEach(tender => {
    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="card border-start border-success border-4 mb-4">
        <div class="card-header p-3">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <span class="badge ${getStatusClass(tender.status)} me-2">${getStatusText(tender.status)}</span>
              <small class="text-muted">${new Date(tender.date).toLocaleDateString('ar-EG')}</small>
            </div>
            <a href="${tender.detailsLink}" target="_blank" class="btn btn-outline-success btn-sm">Details</a>
          </div>
        </div>
        <div class="card-body p-3">
          <h5 class="card-title fw-bold mb-2">${tender.description.split(' for ')[0]}</h5>
          <p class="card-text text-muted mb-2"><i class="bi bi-building"></i> ${tender.companyId ? `Company ${tender.companyId}` : 'Not specified'}</p>
          <p class="card-text text-muted mb-2"><i class="bi bi-geo-alt"></i> Saudi Arabia</p>
          <p class="card-text">${tender.description}</p>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <span class="badge bg-success text-white">${tender.category}</span>
          </div>
        </div>
        <div class="card-footer text-muted d-flex justify-content-between align-items-center">
          ${tender.status === 1 ? '<button class="btn btn-success btn-sm">Apply</button>' : ''}
        </div>
      </div>
    `;
    tendersContainer.appendChild(col);
  });

  const totalPages = Math.ceil(tendersToRender.length / tendersPerPage);
  const paginationDiv = document.createElement('div');
  paginationDiv.className = 'pagination justify-content-center mt-3';
  paginationDiv.innerHTML = `
    <button class="btn btn-outline-success ${currentPage === 1 ? 'disabled' : ''}" id="prevPage">Previous</button>
    <span class="mx-2">Page ${currentPage} of ${totalPages}</span>
    <button class="btn btn-outline-success ${currentPage === totalPages ? 'disabled' : ''}" id="nextPage">Next</button>
  `;
  tendersContainer.appendChild(paginationDiv);

  document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      filterTenders();
    }
  });
  document.getElementById('nextPage')?.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      filterTenders();
    }
  });
}

// Utility Functions
function getStatusClass(status) {
  return status === 0 ? 'badge-danger' : status === 1 ? 'badge-success' : 'badge-secondary';
}

function getStatusText(status) {
  return status === 0 ? 'Closed' : status === 1 ? 'Active' : 'Undefined';
}

function filterTenders() {
  let filtered = [...tenders];
  if (selectedCategory) filtered = filtered.filter(tender => tender.categoryId.toString() === selectedCategory);
  if (searchTerm) filtered = filtered.filter(tender => tender.description.toLowerCase().includes(searchTerm.toLowerCase()));
  renderTenders(filtered);
  if (clearFiltersBtn) clearFiltersBtn.style.display = (selectedCategory || searchTerm) ? 'block' : 'none';
}

// Event Listeners
allCategoriesBtn?.addEventListener('click', () => {
  selectedCategory = null;
  currentPage = 1;
  filterTenders();
  tendersContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
searchInput?.addEventListener('input', (e) => {
  searchTerm = e.target.value.trim();
  currentPage = 1;
  filterTenders();
});
searchButton?.addEventListener('click', () => {
  searchTerm = searchInput.value.trim();
  currentPage = 1;
  filterTenders();
});
clearFiltersBtn?.addEventListener('click', () => {
  selectedCategory = null;
  searchTerm = '';
  currentPage = 1;
  searchInput.value = '';
  filterTenders();
  tendersContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Initial Load
fetchCategoriesAndTenders();