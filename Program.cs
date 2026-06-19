using SmartClinicManagementSystem.Services;

var builder = WebApplication.CreateBuilder(args);

// Add standard ASP.NET Core MVC services with Razor Engine rendering
builder.Services.AddControllersWithViews();

// Register session memory limits for client role tokens
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromHours(2);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// Register unified Firebase Firestore and Auth integration service layer
builder.Services.AddSingleton<FirebaseService>();

var app = builder.Build();

// Configure the HTTP request pipelines
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

// Enable session trackers before Authorization guards
app.UseSession();
app.UseAuthorization();

// Route mappings
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapFallbackToFile("index.html");

app.Run();
