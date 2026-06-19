using Microsoft.AspNetCore.Mvc;
using SmartClinicManagementSystem.Services;

namespace SmartClinicManagementSystem.Controllers
{
    public class HomeController : Controller
    {
        private readonly FirebaseService _firebaseService;

        public HomeController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        public IActionResult Index()
        {
            var doctors = _firebaseService.GetDoctors();
            ViewBag.Doctors = doctors;
            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }
    }
}
