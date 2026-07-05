let modeBtn = document.querySelector("#mode");
let body     = document.querySelector("body");
let currMode = "light";
if (modeBtn) {
    modeBtn.addEventListener("click", () => {
        if (currMode === "light") {
            currMode = "dark";
            body.classList.add("dark");
            body.classList.remove("light");
        } else {
            currMode = "light";
            body.classList.add("light");
            body.classList.remove("dark");
        }
        console.log(currMode);
    });
}

function setupAuthForm(formId, endpoint, options) {

    const form = document.getElementById(formId);

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function(event) {

        event.preventDefault();

        const button = form.querySelector(".submit");

        if (button) {
            button.disabled = true;
            button.classList.add("is-loading");
        }

        try {

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email:    document.getElementById("email").value,
                    password: document.getElementById("password").value
                })
            });

            const data = await response.json();

            alert(data.message);

            if (options.fallbackStatus && response.status === options.fallbackStatus) {
                window.location.href = options.fallbackRedirect;
                return;
            }

            if (response.ok) {
                window.location.href = options.successRedirect;
            }

        } finally {
            if (button) {
                button.disabled = false;
                button.classList.remove("is-loading");
            }
        }

    });

}

setupAuthForm("loginForm", "/login", {
    successRedirect:  "/dashboard",
    fallbackStatus:   404,
    fallbackRedirect: "/register"
});

setupAuthForm("registerForm", "/register", {
    successRedirect: "/login"
});