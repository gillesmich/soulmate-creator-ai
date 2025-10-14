import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
  remainingMinutes?: number;
}

export const PremiumModal = ({ open, onClose, remainingMinutes }: PremiumModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Passez à Premium
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            {remainingMinutes !== undefined ? (
              <>Il vous reste <strong>{remainingMinutes} minutes</strong> d'essai gratuit.</>
            ) : (
              <>Votre période d'essai de 10 minutes est terminée.</>
            )}
          </p>
          <div className="space-y-2">
            <h3 className="font-semibold">Avec Premium, profitez de :</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Temps d'utilisation illimité</li>
              <li>Accès à toutes les fonctionnalités</li>
              <li>Support prioritaire</li>
              <li>Mises à jour exclusives</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                navigate("/pricing");
                onClose();
              }}
              className="flex-1"
            >
              Voir les offres
            </Button>
            {remainingMinutes !== undefined && remainingMinutes > 0 && (
              <Button onClick={onClose} variant="outline" className="flex-1">
                Continuer l'essai
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
