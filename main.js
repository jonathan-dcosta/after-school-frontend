// ======================================
// CONFIG
// ======================================

// IMPORTANT: your Render backend URL
const API_BASE_URL = "https://after-school-backend-fycn.onrender.com";

new Vue({
  el: "#app",

  data: {
    sitename: "After-School Lessons",
    lessons: [],
    cart: [],
    searchTerm: "",
    sortBy: "subject",
    sortOrder: "asc",

    showLessons: true,

    order: {
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      gift: false,
      method: "",
      phone: ""
    },
  },

  computed: {
    // Filter lessons based on search term
    filteredLessons() {
      if (!this.searchTerm.trim()) return this.lessons;

      const term = this.searchTerm.toLowerCase();

      return this.lessons.filter((lesson) =>
        lesson.subject.toLowerCase().includes(term) ||
        lesson.location.toLowerCase().includes(term) ||
        String(lesson.price).includes(term) ||
        String(lesson.spaces).includes(term)
      );
    },

    // Sorting for lessons
    sortedLessons() {
      let sorted = [...this.filteredLessons];

      sorted.sort((a, b) => {
        let valA = a[this.sortBy];
        let valB = b[this.sortBy];

        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();

        if (this.sortOrder === "asc") {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });

      return sorted;
    },

    // Total number of cart items
    cartItemCount() {
      return this.cart.length;
    },

    // Build full details for items in cart
    cartDetails() {
      return this.cart.map((id) => this.lessons.find((lesson) => lesson._id === id));
    },

    // Validation for checkout button
    isCheckoutValid() {
      const nameValid =
        /^[A-Za-z]+$/.test(this.order.firstName) &&
        /^[A-Za-z]+$/.test(this.order.lastName);

      const phoneValid = /^[0-9]{8,15}$/.test(this.order.phone);

      return (
        nameValid &&
        phoneValid &&
        this.order.address &&
        this.order.city &&
        this.order.method &&
        this.cart.length > 0
      );
    },
  },

  methods: {
    // ================================
    // IMAGE URL FIX FOR GITHUB PAGES
    // ================================
    imageUrl(path) {
      if (!path) return "";

      // If already full URL → keep it
      if (path.startsWith("http://") || path.startsWith("https://")) return path;

      // If starts with "/" → append backend
      if (path.startsWith("/")) return API_BASE_URL + path;

      // Otherwise treat as relative
      return `${API_BASE_URL}/${path}`;
    },

    // Remaining spaces
    itemsLeft(lesson) {
      return lesson.spaces - this.cart.filter((id) => id === lesson._id).length;
    },

    // Check if user can add
    canAddToCart(lesson) {
      return this.itemsLeft(lesson) > 0;
    },

    // Add to cart
    addToCart(lesson) {
      if (this.canAddToCart(lesson)) {
        this.cart.push(lesson._id);
      }
    },

    // Remove item from cart
    removeFromCart(index) {
      this.cart.splice(index, 1);
    },

    // Toggle checkout page
    toggleCheckout() {
      this.showLessons = !this.showLessons;
    },

    // Submit order
    async submitForm() {
      if (!this.isCheckoutValid) return;

      try {
        const orderData = {
          firstName: this.order.firstName,
          lastName: this.order.lastName,
          address: this.order.address,
          city: this.order.city,
          method: this.order.method,
          phone: this.order.phone,
          gift: this.order.gift,
          lessonIDs: this.cart,
        };

        // SAVE ORDER (POST)
        await fetch(`${API_BASE_URL}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });

        // UPDATE SPACES FOR EACH LESSON (PUT)
        for (const id of this.cart) {
          const lesson = this.lessons.find((l) => l._id === id);
          if (lesson) {
            const newSpaces = lesson.spaces - 1;

            await fetch(`${API_BASE_URL}/lessons/${lesson._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ spaces: newSpaces }),
            });

            lesson.spaces = newSpaces;
          }
        }

        alert("Your order has been submitted!");
        this.cart = [];
        this.toggleCheckout();
      } catch (err) {
        console.error("Order error:", err);
        alert("Error submitting order.");
      }
    },

    // ================================
    // FETCH LESSONS FROM BACKEND
    // ================================
    async fetchLessons() {
      try {
        const res = await fetch(`${API_BASE_URL}/lessons`);
        const data = await res.json();

        this.lessons = data;
      } catch (err) {
        console.error("Error loading lessons:", err);
      }
    },
  },

  created() {
    this.fetchLessons();
  },
});
