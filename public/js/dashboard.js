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

  function addVariant() {
  const section = document.getElementById('variantSection');
  const index = section.children.length;

  const html = `
    <div class="form-group">
      <label>Size:</label>
      <input type="text" name="variantSizes" required>

      <label>Color:</label>
      <input type="text" name="variantColors" required>

      <label>Price:</label>
      <input type="number" name="variantPrices" required>

      <label>Stock:</label>
      <input type="number" name="variantStocks" required>

      <label>Image:</label>
      <input type="file" name="productImages" accept="image/*" required>
    </div>
  `;

  section.insertAdjacentHTML('beforeend', html);
}
const removedIds = [];

  function removeExistingVariant(button, id) {
    button.parentElement.remove();
    removedIds.push(id);
    document.getElementById('removedVariantIds').value = removedIds.join(',');
  }

  function addNewVariant() {
    const container = document.getElementById('newVariantsContainer');
    const div = document.createElement('div');
    div.classList.add('variant-block');
    div.style = "margin-top: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;";
    div.innerHTML = `
      <label>Size</label>
      <input type="text" name="newVariantSizes[]" required style="width:100%; padding: 8px; border:1px solid #ccc; border-radius: 6px;">
      <label style="margin-top: 0.5rem;">Color</label>
      <input type="text" name="newVariantColors[]" required style="width:100%; padding: 8px; border:1px solid #ccc; border-radius: 6px;">
      <label style="margin-top: 0.5rem;">Price</label>
      <input type="number" name="newVariantPrices[]" required style="width:100%; padding: 8px; border:1px solid #ccc; border-radius: 6px;">
      <label style="margin-top: 0.5rem;">Stock</label>
      <input type="number" name="newVariantStocks[]" required style="width:100%; padding: 8px; border:1px solid #ccc; border-radius: 6px;">
      <label style="margin-top: 0.5rem;">Image</label>
      <input type="file" name="newVariantImages" accept="image/*" required style="width:100%; padding: 6px; border-radius: 6px; border: 1px solid #ccc;">
      <button type="button" onclick="removeVariantBlock(this)" style="margin-top: 0.8rem; background: #dc3545; color: white; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer;">Remove</button>
    `;
    container.appendChild(div);
  }

  function removeVariantBlock(btn) {
    btn.parentElement.remove();
  }