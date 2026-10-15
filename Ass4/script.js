
const form = document.getElementById("employeeForm");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const phone = document.getElementById("phone").value.trim();
    const department = document.getElementById("department").value;

    const errors = {
        name: "",
        email: "",
        password: "",
        phone: "",
        department: ""
    };

    if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(name)) {
        errors.name = "Enter a valid name (at least 2 characters).";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = "Enter a valid email address.";
    }

    if (
        password.length < 8 ||
        !/[A-Za-z]/.test(password) ||
        !/[0-9]/.test(password)
    ) {
        errors.password =
            "Password must contain 8 characters, a letter and a number.";
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
        errors.phone = "Enter a valid 10-digit Indian mobile number.";
    }

    if (department === "") {
        errors.department = "Please select a department.";
    }

    document.getElementById("nameError").textContent = errors.name;
    document.getElementById("emailError").textContent = errors.email;
    document.getElementById("passwordError").textContent = errors.password;
    document.getElementById("phoneError").textContent = errors.phone;
    document.getElementById("departmentError").textContent =
        errors.department;

    const hasErrors = Object.values(errors).some(error => error !== "");

    const successMessage = document.getElementById("successMessage");

    if (hasErrors) {
        successMessage.textContent = "";
        return;
    }

    successMessage.textContent =
        "Employee registered successfully! Welcome, " + name + ".";

    form.reset();
});
