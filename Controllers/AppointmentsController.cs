using Microsoft.AspNetCore.Mvc;
using SmartClinicManagementSystem.Models;
using SmartClinicManagementSystem.Services;

namespace SmartClinicManagementSystem.Controllers
{
    public class AppointmentsController : Controller
    {
        private readonly FirebaseService _firebaseService;

        public AppointmentsController(FirebaseService firebaseService)
        {
            _firebaseService = firebaseService;
        }

        public IActionResult Index()
        {
            var appts = _firebaseService.GetAppointments();
            return View(appts);
        }

        [HttpPost]
        public IActionResult Book(Appointment appt)
        {
            appt.Id = "APT-" + new Random().Next(10000, 99999);
            appt.Status = "Pending";
            _firebaseService.SaveAppointment(appt);
            return RedirectToAction("Dashboard", "Account");
        }

        [HttpPost]
        public IActionResult UpdateStatus(string id, string status)
        {
            var appts = _firebaseService.GetAppointments();
            var target = appts.FirstOrDefault(a => a.Id == id);
            if (target != null)
            {
                target.Status = status;
                _firebaseService.SaveAppointment(target);
            }
            return RedirectToAction("Dashboard", "Account");
        }
    }
}
