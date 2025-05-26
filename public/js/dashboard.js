const ctx = document.getElementById('salesChart').getContext('2d');

new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [{
      label: 'Sales (₹)',
      data: [200, 450, 300, 500, 600, 700, 400],
      borderColor: 'rgba(75, 192, 192, 1)',
      tension: 0.4,
      fill: false
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
    }
  }
});

  function confirmBlock(userId) {
    if (confirm("Are you sure you want to block this user?")) {
      window.location.href = `/admin/users/block/${userId}`;
    }
  }

  function confirmUnblock(userId) {
    if (confirm("Are you sure you want to unblock this user?")) {
      window.location.href = `/admin/users/unblock/${userId}`;
    }
  }

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('hidden');
  }
  function confirmToggle(userId, isBlocked) {
    const action = isBlocked ? 'Unblock' : 'Block';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
      fetch(`/admin/users/${userId}/${isBlocked ? 'unblock' : 'block'}`, {
        method: 'POST',
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          location.reload();
        } else {
          alert('Something went wrong!');
        }
      })
      .catch(() => alert('Server error occurred!'));
    }
  }
  
   function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    window.location.href = '/admin/users'; // Redirect to show full list
  } else {
    console.log('Search input not found!');
  }
}
function clearSearchCat() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.value = '';
    window.location.href = '/admin/categories'; // Redirect to show full list
  } else {
    console.log('Search input not found!');
  }
}
function addSubcategoryField() {
    const container = document.getElementById('subcategoryFields');
    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'subcategories';
    input.placeholder = 'Enter subcategory';
    input.classList.add('form-input');
    container.appendChild(input);
  }
  function addNewSubcategoryField() {
    const container = document.getElementById("newSubcategories");
    const div = document.createElement("div");
    div.className = "subcategory-row";
    div.innerHTML = `
      <input type="text" name="newSubcategories[]" class="input-field" placeholder="Enter subcategory" />
      <button type="button" class="delete-btn" onclick="this.parentElement.remove()">🗑️</button>
    `;
    container.appendChild(div);
  }

  function removeExistingSubcategory(subcatId, btn) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "deleteSubcategories[]";
    input.value = subcatId;
    btn.closest(".subcategory-row").appendChild(input);
    btn.closest(".subcategory-row").style.display = "none";
  }