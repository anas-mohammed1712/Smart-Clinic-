using Microsoft.AspNetCore.Mvc;
using SmartClinicManagementSystem.Models;
using SmartClinicManagementSystem.Services;

namespace SmartClinicManagementSystem.Controllers
{
    public class DoctorsController : Controller
    {
        private readonly FirebaseService _firebaseService;

        public DoctorsController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        public IActionResult Index()
        {
            var doctors = _firebaseService.GetDoctors();
            return View(doctors);
        }

        [HttpGet]
        public IActionResult Create()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Create(Doctor doctor)
        {
            if (ModelState.IsValid)
            {
                doctor.DoctorId = "DOC-" + new Random().Next(1000, 9999);
                _firebaseService.SaveDoctor(doctor);
                return RedirectToAction("Index");
            }
            return View(doctor);
        }

        [HttpPost]
        public IActionResult Delete(string id)
        {
            _firebaseService.DeleteDoctor(id);
            return RedirectToAction("Index");
        }
    }
}
