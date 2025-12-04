// Backend API base URL (Render)
const API_BASE_URL = "https://after-school-backend-fycn.onrender.com";

let webstore = new Vue({
  el: '#app',

  data: {
    sitename: 'After-School Lessons',

    lessons: [],
    cart: [],
    showLessons: true,

    searchTerm: '',
    sortBy: 'subject',
    sortOrder: 'asc',

    order: {
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      gift: false,
      method: 'Home',
      phone: ''
    },

    orderMessage: ''
  },

  created() {
    this.fetchLessons();
  },

  computed: {
    cartItemCount() {
      return this.cart.length || '';
    },

    // All fields mandatory:
    // - cart not empty
    // - first & last name: letters only
    // - address not empty
    // - city/emirate selected
    // - phone numbers only
    isCheckoutValid() {
      const nameRegex = /^[A-Za-z\s]+$/;
      const phoneRegex = /^[0-9]+$/;

      return (
        this.cart.length > 0 &&
        nameRegex.test(this.order.firstName) &&
        nameRegex.test(this.order.lastName) &&
        this.order.address.trim() !== '' &&
        this.order.city.trim() !== '' &&
        phoneRegex.test(this.order.phone)
      );
    },

    cartDetails() {
      return this.cart
        .map(id => this.lessons.find(lesson => lesson._id === id))
        .filter(Boolean);
    },

    filteredLessons() {
      if (!this.searchTerm) return this.lessons;
      const term = this.searchTerm.toLowerCase();

      return this.lessons.filter(lesson =>
        lesson.subject.toLowerCase().includes(term) ||
        lesson.location.toLowerCase().includes(term)
      );
    },

    sortedLessons() {
      const lessons = this.filteredLessons.slice();
      lessons.sort((a, b) => {
        let fa = a[this.sortBy];
        let fb = b[this.sortBy];

        if (typeof fa === 'string') {
          fa = fa.toLowerCase();
          fb = fb.toLowerCase();
        }

        if (fa < fb) return this.sortOrder === 'asc' ? -1 : 1;
        if (fa > fb) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      return lessons;
    }
  },

  // === IMAGE HELPER ===
    methods: {
      imageUrl(path) {
        if (!path) return "";
        if (path.startsWith("http://") || path.startsWith("https://")) {
          return path;
        }
    // If it starts with "/", append after the backend base
        if (path.startsWith("/")) {
          return API_BASE_URL + path;
        }
    // Otherwise, add a "/" in between
        return "${API_BASE_URL}/${path}";
    },
    
    // === FETCH FUNCTIONS ===

// Fetch all lessons from the backend (Express + MongoDB)
// Currently uses localhost:3000; will be switched to Render later.
    fetchLessons() {
      fetch('${API_BASE_URL}/collection/lesson')
        .then(response => response.json())
        .then(data => {
          this.lessons = data;
        })
        .catch(err => console.error('Error loading lessons:', err));
    },

    submitForm() {
      if (!this.isCheckoutValid) {
        alert(
          'Please fill in all fields.\n' +
          '- First & Last Name: letters only\n' +
          '- Phone: numbers only\n' +
          '- Address and City/Emirate must not be empty.'
        );
        return;
      }

      // build lessonCounts: how many times each lesson is in the cart
      const lessonCounts = {};
      this.cart.forEach(id => {
        lessonCounts[id] = (lessonCounts[id] || 0) + 1;
      });

      const lessonIDs = Object.keys(lessonCounts);
      const spaces = lessonIDs.map(id => ({
        lessonId: id,
        spaces: lessonCounts[id]
      }));

      const orderToSend = {
        name: `${this.order.firstName} ${this.order.lastName}`,
        phone: this.order.phone,
        lessonIDs,
        spaces
      };

      fetch('${API_BASE_URL}/collection/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderToSend)
      })
        .then(res => res.json())
        .then(() => {
          // After order is saved, update spaces in DB
          this.updateSpacesOnServer(lessonCounts);
        })
        .catch(err => {
          console.error('Order error:', err);
          alert('There was a problem submitting your order.');
        });
    },

    updateSpacesOnServer(lessonCounts) {
      const promises = [];

      this.lessons.forEach(lesson => {
        const count = lessonCounts[lesson._id];
        if (count) {
          const newSpaces = lesson.spaces - count;
          promises.push(
            fetch('${API_BASE_URL}/collection/lesson/${lesson._id}', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spaces: newSpaces })
            })
          );
        }
      });

      Promise.all(promises)
        .then(() => {
          alert('Order submitted!');
          // Reset form and cart
          this.cart = [];
          this.order.firstName = '';
          this.order.lastName = '';
          this.order.address = '';
          this.order.city = '';
          this.order.phone = '';
          this.order.gift = false;
          this.order.method = 'Home';
          this.showLessons = true;
          this.fetchLessons(); // reload updated spaces
        })
        .catch(err => {
          console.error('Error updating spaces:', err);
        });
    },

    // === CART LOGIC ===

    cartCount(lessonId) {
      return this.cart.filter(id => id === lessonId).length;
    },

    itemsLeft(lesson) {
      return lesson.spaces - this.cartCount(lesson._id);
    },

    canAddToCart(lesson) {
      return this.itemsLeft(lesson) > 0;
    },

    addToCart(lesson) {
      if (this.canAddToCart(lesson)) {
        this.cart.push(lesson._id);
      }
    },

    removeFromCart(index) {
      this.cart.splice(index, 1);
    },

    toggleCheckout() {
      this.showLessons = !this.showLessons;
    }
  }
});
